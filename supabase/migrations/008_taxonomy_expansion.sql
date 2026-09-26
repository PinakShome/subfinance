-- Expansion of the category taxonomy (Sep 2026) to match the widened
-- alternatives catalogue (server/src/eval/reference-catalog.ts). Adds three new
-- selectable categories so subscriptions in these areas match the catalogue and
-- power the cheaper-alternatives feature. Paste into the Supabase SQL editor and
-- Run once. Idempotent.
insert into public.categories (name) values
  ('Business & Accounting'),
  ('Faith & Spirituality'),
  ('Music Creation')
on conflict (name) do nothing;
