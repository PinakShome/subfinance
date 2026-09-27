-- Second taxonomy expansion (Sep 2026) accompanying the Wave A catalogue growth.
-- Adds two more selectable categories so subscriptions in these areas match the
-- catalogue and power cheaper-alternatives. Paste into the Supabase SQL editor
-- and Run once. Idempotent.
insert into public.categories (name) values
  ('Travel & Loyalty'),
  ('Pets')
on conflict (name) do nothing;
