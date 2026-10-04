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