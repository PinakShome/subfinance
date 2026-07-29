-- Categories is a shared read-only lookup table. Without RLS, anyone holding
-- the public anon key (which ships inside the app bundle) could insert, edit,
-- or delete rows. This was already applied by hand in production; recording it
-- here so a database rebuilt from migrations is not left writable.
alter table public.categories enable row level security;

drop policy if exists "Categories are readable by everyone" on public.categories;
create policy "Categories are readable by everyone"
  on public.categories
  for select
  using (true);

-- No insert/update/delete policy: only the service role can modify categories.
