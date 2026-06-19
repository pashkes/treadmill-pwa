create table public.workouts (
  client_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_date date not null,
  workout_time text not null,
  seconds integer not null check (seconds >= 0),
  km double precision not null check (km >= 0),
  kcal double precision not null check (kcal >= 0),
  minutes double precision not null check (minutes >= 0),
  steps integer not null check (steps >= 0),
  max_speed double precision not null check (max_speed >= 0),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz null
);

create index workouts_user_updated_idx on public.workouts (user_id, updated_at);
create index workouts_user_deleted_idx on public.workouts (user_id, deleted_at);

alter table public.workouts enable row level security;

create policy "Users can read their workouts"
on public.workouts
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their workouts"
on public.workouts
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their workouts"
on public.workouts
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
