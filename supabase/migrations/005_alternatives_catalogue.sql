-- Universal alternatives catalogue: the improving reference the live API reads.
-- raw_payload  = last LLM (web-grounded, judged) generation for the service.
-- payload      = raw AFTER feedback ranking + owner overrides applied. This is
--                what the app serves, so live reads are a single-row lookup.
create table if not exists public.alternatives_catalogue (
  service_key   text primary key,           -- normalized "name|category"
  service_name  text not null,
  category      text not null default '',
  raw_payload   jsonb not null default '[]',
  payload       jsonb not null default '[]',
  quality_score int,                          -- last judge score (0-100)
  request_count int not null default 0,       -- demand signal
  status        text not null default 'active', -- 'active' | 'needs_review'
  refreshed_at  timestamptz not null default now(), -- when raw was generated
  resolved_at   timestamptz not null default now()  -- when payload was recomputed
);
alter table public.alternatives_catalogue enable row level security; -- service-role only

-- App-owner curation. Highest priority; the LLM never overwrites it.
create table if not exists public.alternative_overrides (
  id               uuid primary key default gen_random_uuid(),
  service_key      text not null,
  alternative_name text not null,
  action           text not null check (action in ('pin', 'block', 'edit')),
  patch            jsonb not null default '{}',  -- for pin/edit: partial alternative fields
  created_at       timestamptz not null default now(),
  unique (service_key, alternative_name, action)
);
alter table public.alternative_overrides enable row level security; -- service-role only
create index if not exists alternative_overrides_key_idx on public.alternative_overrides (service_key);

-- Atomic demand counter for the live path (fire-and-forget from the API).
create or replace function public.bump_catalogue_request(p_key text)
returns void language sql security definer set search_path = '' as $$
  update public.alternatives_catalogue
     set request_count = request_count + 1
   where service_key = p_key;
$$;
