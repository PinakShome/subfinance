create table if not exists price_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  subscription_id uuid references subscriptions(id) on delete cascade not null,
  old_cost numeric(10,2) not null,
  new_cost numeric(10,2) not null,
  currency text not null default 'USD',
  changed_at timestamptz not null default now()
);
alter table price_history enable row level security;
create policy "Users manage own price history"
  on price_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create index on price_history(subscription_id, changed_at desc);
