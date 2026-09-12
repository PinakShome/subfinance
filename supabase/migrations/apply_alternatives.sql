-- Consolidated apply script for the alternatives feature (migrations 004 + 005).
-- Migration 003 (alternatives_cache) is intentionally omitted — it's superseded
-- by the catalogue below. Paste this whole file into the Supabase SQL editor and
-- Run once. Safe to re-run (idempotent).

-- ── 004: per-user thumbs up/down on suggested alternatives ──────────────────
create table if not exists public.alternative_feedback (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  service_name     text not null,
  alternative_name text not null,
  helpful          boolean not null,
  created_at       timestamptz not null default now()
);
alter table public.alternative_feedback enable row level security;
drop policy if exists "Users manage own alternative feedback" on public.alternative_feedback;
create policy "Users manage own alternative feedback"
  on public.alternative_feedback for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists alternative_feedback_service_idx
  on public.alternative_feedback (service_name);

-- ── 005: universal catalogue + owner overrides + demand counter ─────────────
create table if not exists public.alternatives_catalogue (
  service_key   text primary key,
  service_name  text not null,
  category      text not null default '',
  raw_payload   jsonb not null default '[]',
  payload       jsonb not null default '[]',
  quality_score int,
  request_count int not null default 0,
  status        text not null default 'active',
  refreshed_at  timestamptz not null default now(),
  resolved_at   timestamptz not null default now()
);
alter table public.alternatives_catalogue enable row level security; -- service-role only

create table if not exists public.alternative_overrides (
  id               uuid primary key default gen_random_uuid(),
  service_key      text not null,
  alternative_name text not null,
  action           text not null check (action in ('pin', 'block', 'edit')),
  patch            jsonb not null default '{}',
  created_at       timestamptz not null default now(),
  unique (service_key, alternative_name, action)
);
alter table public.alternative_overrides enable row level security; -- service-role only
create index if not exists alternative_overrides_key_idx on public.alternative_overrides (service_key);

create or replace function public.bump_catalogue_request(p_key text)
returns void language sql security definer set search_path = '' as $$
  update public.alternatives_catalogue
     set request_count = request_count + 1
   where service_key = p_key;
$$;

-- Force PostgREST to pick up the new tables immediately (avoids schema-cache lag).
notify pgrst, 'reload schema';
