-- Cache for AI-generated subscription alternatives.
-- Keyed by service name + category (NOT per-user), so the LLM is called at most
-- once per service per refresh window. The per-user "cheaper than what you pay"
-- filtering is applied at request time, not stored here.
create table if not exists public.alternatives_cache (
  cache_key    text primary key,
  payload      jsonb not null,
  refreshed_at timestamptz not null default now()
);

-- Written and read only by the backend (service role). RLS on with no policy
-- means no anon/authenticated client can touch it directly.
alter table public.alternatives_cache enable row level security;
