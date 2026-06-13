-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Categories table (seeded with defaults)
create table public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  color text not null default '#6366f1',
  icon text not null default 'layers'
);

insert into public.categories (name, color, icon) values
  ('Streaming',   '#ef4444', 'play-circle'),
  ('Music',       '#8b5cf6', 'music'),
  ('Software',    '#3b82f6', 'cpu'),
  ('Cloud',       '#06b6d4', 'cloud'),
  ('Gaming',      '#f59e0b', 'gamepad-2'),
  ('Fitness',     '#10b981', 'activity'),
  ('News',        '#64748b', 'newspaper'),
  ('Finance',     '#f97316', 'dollar-sign'),
  ('Other',       '#6366f1', 'layers');

-- Subscriptions table
create table public.subscriptions (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  category_id   uuid references public.categories(id) on delete set null,
  cost          numeric(10,2) not null check (cost >= 0),
  currency      text not null default 'USD',
  billing_cycle text not null check (billing_cycle in ('monthly','quarterly','annual','custom')),
  -- For 'custom' billing_cycle, interval_days holds the number of days
  interval_days int,
  next_renewal  date not null,
  started_on    date,
  notes         text,
  is_trial      boolean not null default false,
  trial_ends_on date,
  is_active     boolean not null default true,
  website_url   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- RLS: users can only see/edit their own subscriptions
alter table public.subscriptions enable row level security;

create policy "Users manage own subscriptions"
  on public.subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep updated_at fresh automatically
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.touch_updated_at();

-- Notification preferences
create table public.notification_prefs (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  remind_days_before int[] not null default '{3,1}',
  push_token        text,
  enabled           boolean not null default true,
  updated_at        timestamptz not null default now()
);

alter table public.notification_prefs enable row level security;

create policy "Users manage own notification prefs"
  on public.notification_prefs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Indexes for common queries
create index subscriptions_user_id_idx on public.subscriptions(user_id);
create index subscriptions_next_renewal_idx on public.subscriptions(next_renewal);
create index subscriptions_is_active_idx on public.subscriptions(is_active);
