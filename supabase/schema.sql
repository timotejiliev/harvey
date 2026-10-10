-- Harvey schema for the Supabase-backed store (not yet wired in; v1 uses browser storage).
-- Every table is owned by a user and protected by row level security, so the same
-- schema works for single-user now and multi-user / paid tiers later.

create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  status text not null default 'Saved',
  follow_up_date date,
  data jsonb not null,            -- the Job object (evaluation, documents, notes, ...)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index jobs_user_status on public.jobs (user_id, status);

create table public.library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('story','answer')),
  data jsonb not null
);

alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.library enable row level security;

create policy "own profile" on public.profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own jobs" on public.jobs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own library" on public.library for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- API keys are deliberately NOT stored here in the bring-your-own-key tier.
