-- Run this once in Supabase → SQL Editor.
create table if not exists public.student_progress (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_key text not null check (activity_key in ('a1-1', 'a1-2', 'conversation')),
  status text not null default 'started' check (status in ('started', 'completed')),
  last_played_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (user_id, activity_key)
);
alter table public.student_progress enable row level security;
create policy "Students read own progress" on public.student_progress for select using (auth.uid() = user_id);
create policy "Students add own progress" on public.student_progress for insert with check (auth.uid() = user_id);
create policy "Students update own progress" on public.student_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Account lookup table used only by the secure Vercel API to distinguish sign-in from sign-up.
create table if not exists public.student_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  created_at timestamptz not null default now()
);
alter table public.student_profiles enable row level security;
create policy "Students read own profile" on public.student_profiles for select using (auth.uid() = id);

create or replace function public.handle_student_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.student_profiles (id, email, full_name)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do update set email = excluded.email, full_name = excluded.full_name;
  return new;
end;
$$;
drop trigger if exists on_auth_student_created on auth.users;
create trigger on_auth_student_created
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute procedure public.handle_student_profile();

-- Backfill users created before this SQL was run.
insert into public.student_profiles (id, email, full_name)
select id, lower(email), coalesce(raw_user_meta_data ->> 'full_name', '') from auth.users
on conflict (id) do nothing;