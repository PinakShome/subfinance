-- Align the app's global category list with the alternatives taxonomy so a
-- subscription's category matches the catalogue and powers category pools.
-- Paste into the Supabase SQL editor and Run once. Idempotent.

-- 1. Add the 31 taxonomy categories (existing same-named rows like Gaming /
--    Fitness are kept; color/icon use table defaults).
insert into public.categories (name) values
  ('Streaming Video'), ('Live TV Streaming'), ('Sports Streaming'), ('Music Streaming'),
  ('Books & Audiobooks'), ('Gaming'), ('Cloud Storage'), ('AI Tools'),
  ('Productivity & Office'), ('Communication'), ('Developer & Cloud'), ('Design & Creative'),
  ('Photography'), ('Website & eCommerce'), ('Security & Privacy'), ('Fitness'),
  ('Mental Health & Meditation'), ('Health & Nutrition'), ('Education & Learning'),
  ('Language Learning'), ('Writing & Utilities'), ('News & Magazines'),
  ('Food & Meal Delivery'), ('Retail & Shopping'), ('Dating'), ('Social & Creator'),
  ('Smart Home & Security'), ('Auto & Connected Car'), ('Telecom & Mobile'),
  ('Finance & Investing'), ('Subscription Boxes')
on conflict (name) do nothing;

-- 2. Remap existing subscriptions from legacy categories to the taxonomy, then
--    drop the now-orphaned legacy rows. "Gaming", "Fitness" and "Other" are kept.
do $$
declare
  m record;
begin
  for m in
    select * from (values
      ('Streaming', 'Streaming Video'),
      ('Music',     'Music Streaming'),
      ('Cloud',     'Cloud Storage'),
      ('Software',  'Productivity & Office'),
      ('News',      'News & Magazines'),
      ('Finance',   'Finance & Investing')
    ) as t(old_name, new_name)
  loop
    update public.subscriptions s
       set category_id = (select id from public.categories where name = m.new_name)
     where s.category_id = (select id from public.categories where name = m.old_name);
    delete from public.categories where name = m.old_name;
  end loop;
end $$;
