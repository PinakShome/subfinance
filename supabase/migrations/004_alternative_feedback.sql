-- Per-user thumbs up/down on suggested alternatives. This is the real-world
-- quality signal: aggregate helpful/not-helpful per (service, alternative) to
-- see which suggestions land and which to improve or exclude.
create table if not exists public.alternative_feedback (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  service_name     text not null,
  alternative_name text not null,
  helpful          boolean not null,
  created_at       timestamptz not null default now()
);

alter table public.alternative_feedback enable row level security;

create policy "Users manage own alternative feedback"
  on public.alternative_feedback
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists alternative_feedback_service_idx
  on public.alternative_feedback (service_name);
