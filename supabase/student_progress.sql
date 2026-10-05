-- Run in Supabase → SQL Editor → New query. Safe to run again: every statement is idempotent.

-- ============================================================
-- Progress per student and activity (shown on /account and /admin)
-- ============================================================
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
drop policy if exists "Students read own progress" on public.student_progress;
create policy "Students read own progress" on public.student_progress for select using (auth.uid() = user_id);
drop policy if exists "Students add own progress" on public.student_progress;
create policy "Students add own progress" on public.student_progress for insert with check (auth.uid() = user_id);
drop policy if exists "Students update own progress" on public.student_progress;
create policy "Students update own progress" on public.student_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Activity log: every login, game started and game completed (shown on /admin)
-- ============================================================
create table if not exists public.student_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('login', 'started', 'completed')),
  activity_key text check (activity_key in ('a1-1', 'a1-2', 'conversation')),
  created_at timestamptz not null default now()
);
create index if not exists student_events_created_at on public.student_events (created_at desc);
alter table public.student_events enable row level security;
drop policy if exists "Students add own events" on public.student_events;
create policy "Students add own events" on public.student_events for insert with check (auth.uid() = user_id);
drop policy if exists "Students read own events" on public.student_events;
create policy "Students read own events" on public.student_events for select using (auth.uid() = user_id);

-- ============================================================
-- Profiles: name and email of every account, filled automatically
-- ============================================================
create table if not exists public.student_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  created_at timestamptz not null default now()
);
alter table public.student_profiles enable row level security;
drop policy if exists "Students read own profile" on public.student_profiles;
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

-- Backfill accounts created before this file was run.
insert into public.student_profiles (id, email, full_name)
select id, lower(email), coalesce(raw_user_meta_data ->> 'full_name', '') from auth.users
on conflict (id) do nothing;
