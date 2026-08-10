-- JMB 2 Creations Operational Phase 13
-- Dynamic catalog categories + Heart Phone Stand color normalization.
-- Safe to run after the existing JMB operational migrations.

create table if not exists public.jmb_catalog_families (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  image_url text,
  customizable boolean not null default true,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.jmb_catalog_families(slug, name, description, image_url, customizable, active, sort_order)
values
  ('soap-dispensers','Soap Dispensers','Custom soap dispenser designs.',null,true,true,10),
  ('tap-wands','Tap Wands','Custom tap wand designs.',null,true,true,20),
  ('cup-koozies','Cup Koozies','Sports and themed cup koozies.',null,true,true,30),
  ('display-shelves','Display Shelves','Custom shelves and display pieces for mini figures and collectibles.',null,true,true,40),
  ('cosplay-props','Cosplay Props','Decorative costume and display props made for cosplay, photos, and collections.',null,true,true,50),
  ('glasses-holder','Glasses Holder','Character-inspired glasses holders and display cases for keeping eyewear organized and easy to grab.','/catalog/glasses-holder/main.webp',true,true,60),
  ('heart-phone-stands','Heart Phone Stands','Curved heart-shaped phone stands in colorful 3D-printed finishes for desks, counters and nightstands.','/catalog/heart-phone-stands/main.webp',true,true,70)
on conflict (slug) do nothing;

alter table public.jmb_catalog_families enable row level security;

drop policy if exists "public reads active catalog families" on public.jmb_catalog_families;
create policy "public reads active catalog families"
on public.jmb_catalog_families for select
to anon, authenticated
using (active = true or exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()));

drop policy if exists "JMB admins create catalog families" on public.jmb_catalog_families;
create policy "JMB admins create catalog families"
on public.jmb_catalog_families for insert
to authenticated
with check (exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()));

drop policy if exists "JMB admins update catalog families" on public.jmb_catalog_families;
create policy "JMB admins update catalog families"
on public.jmb_catalog_families for update
to authenticated
using (exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()));

drop policy if exists "JMB admins delete catalog families" on public.jmb_catalog_families;
create policy "JMB admins delete catalog families"
on public.jmb_catalog_families for delete
to authenticated
using (exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()));

grant select on public.jmb_catalog_families to anon, authenticated;
grant insert, update, delete on public.jmb_catalog_families to authenticated;

-- Normalize any Heart Phone Stand products that were uploaded before Phase 13.
-- The customer-facing product becomes one product with five fixed color choices.
update public.jmb_catalog_items
set team = case
  when lower(coalesce(team,'') || ' ' || coalesce(name,'')) like '%hot pink%' then 'Hot Pink'
  when lower(coalesce(team,'') || ' ' || coalesce(name,'')) like '%light pink%' then 'Light Pink'
  when lower(coalesce(team,'') || ' ' || coalesce(name,'')) like '%black%' then 'Black'
  when lower(coalesce(team,'') || ' ' || coalesce(name,'')) like '%white%' then 'White'
  when lower(coalesce(team,'') || ' ' || coalesce(name,'')) like '%red%' then 'Red'
  when lower(coalesce(team,'') || ' ' || coalesce(name,'')) like '%pink%' then 'Hot Pink'
  else team
end
where family_slug = 'heart-phone-stands';

update public.jmb_catalog_items
set name = 'Heart Phone Stand'
where family_slug = 'heart-phone-stands'
  and team in ('Red','Hot Pink','Light Pink','Black','White');

-- Keep category updated_at useful for future dashboard edits.
create or replace function public.jmb_touch_catalog_family_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists jmb_catalog_families_touch_updated_at on public.jmb_catalog_families;
create trigger jmb_catalog_families_touch_updated_at
before update on public.jmb_catalog_families
for each row execute function public.jmb_touch_catalog_family_updated_at();
