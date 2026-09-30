-- Implicit feedback: one row per time a user opens an alternative's website from
-- the alternatives screen. Click-through is a softer quality signal than an
-- explicit thumbs up/down, and folds into ranking at a low weight. Mirrors the
-- alternative_feedback table's shape and RLS. Paste into the Supabase SQL editor
-- and Run once. Idempotent.
create table if not exists public.alternative_clicks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  service_name     text not null,
  alternative_name text not null,
  created_at       timestamptz not null default now()
);

alter table public.alternative_clicks enable row level security;

create policy "Users insert own alternative clicks"
  on public.alternative_clicks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists alternative_clicks_service_idx
  on public.alternative_clicks (service_name);
