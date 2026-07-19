-- Agent Disaster Lab — Supabase schema
-- Run this in your Supabase project: SQL Editor → New query → paste → Run
-- https://supabase.com/dashboard/project/<your-project-id>/sql

-- ── 1. Profiles ───────────────────────────────────────────────────────────────
-- Public profile for each authenticated user (username for leaderboard)

create table if not exists public.profiles (
  id         uuid        references auth.users(id) on delete cascade primary key,
  username   text        not null,
  created_at timestamptz default now() not null,
  constraint username_length check (char_length(username) between 3 and 20),
  constraint username_format check (username ~ '^[a-zA-Z0-9_]+$')
);

-- Case-insensitive unique constraint
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

create policy "profiles_read_all"   on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- ── 2. Completions ────────────────────────────────────────────────────────────
-- One row per (user, mission). Upsert-safe via the unique constraint.

create table if not exists public.completions (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        references auth.users(id) on delete cascade not null,
  mission_id    text        not null,
  agent_id      text        not null,
  points_earned integer     not null check (points_earned > 0),
  attack_turns  integer     not null check (attack_turns > 0),
  completed_at  timestamptz default now() not null,
  unique(user_id, mission_id)
);

alter table public.completions enable row level security;

create policy "completions_read_own"   on public.completions for select using (auth.uid() = user_id);
create policy "completions_insert_own" on public.completions for insert with check (auth.uid() = user_id);
create policy "completions_update_own" on public.completions for update using (auth.uid() = user_id);

-- ── 3. Leaderboard views (public, no auth required) ───────────────────────────

-- Overall ranking across all agent packs
create or replace view public.leaderboard_all as
select
  p.id                              as user_id,
  p.username,
  coalesce(sum(c.points_earned), 0)::int as total_points,
  count(c.id)::int                  as missions_completed,
  max(c.completed_at)               as last_activity
from public.profiles p
left join public.completions c on c.user_id = p.id
group by p.id, p.username
order by total_points desc, missions_completed desc;

grant select on public.leaderboard_all to anon, authenticated;

-- Per-agent ranking (filter by agent_id in query)
create or replace view public.leaderboard_by_agent as
select
  p.id                          as user_id,
  p.username,
  c.agent_id,
  sum(c.points_earned)::int     as agent_points,
  count(c.id)::int              as agent_missions,
  max(c.completed_at)           as last_activity
from public.profiles p
join public.completions c on c.user_id = p.id
group by p.id, p.username, c.agent_id
order by agent_points desc;

grant select on public.leaderboard_by_agent to anon, authenticated;
