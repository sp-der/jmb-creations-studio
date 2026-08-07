-- JMB 2 Creations live catalog manager
-- Run this in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.jmb_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.jmb_catalog_items (
  id uuid primary key default gen_random_uuid(),
  family_slug text not null,
  name text not null,
  image_url text not null,
  team text,
  size text,
  price numeric(10,2) not null default 0 check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  made_to_order boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jmb_catalog_items_family_idx on public.jmb_catalog_items (family_slug, active, sort_order);

create or replace function public.jmb_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists jmb_catalog_items_touch on public.jmb_catalog_items;
create trigger jmb_catalog_items_touch before update on public.jmb_catalog_items
for each row execute function public.jmb_touch_updated_at();

alter table public.jmb_admins enable row level security;
alter table public.jmb_catalog_items enable row level security;

-- Admin users can read their own admin-membership row.
drop policy if exists "JMB admins read own membership" on public.jmb_admins;
create policy "JMB admins read own membership"
on public.jmb_admins for select
to authenticated
using (user_id = auth.uid());

-- Anyone may read active storefront items.
drop policy if exists "public reads active JMB catalog" on public.jmb_catalog_items;
create policy "public reads active JMB catalog"
on public.jmb_catalog_items for select
to anon, authenticated
using (active = true or exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()));

-- Only rows in jmb_admins can change the catalog.
drop policy if exists "JMB admins insert catalog" on public.jmb_catalog_items;
create policy "JMB admins insert catalog"
on public.jmb_catalog_items for insert
to authenticated
with check (exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()));

drop policy if exists "JMB admins update catalog" on public.jmb_catalog_items;
create policy "JMB admins update catalog"
on public.jmb_catalog_items for update
to authenticated
using (exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()));

drop policy if exists "JMB admins delete catalog" on public.jmb_catalog_items;
create policy "JMB admins delete catalog"
on public.jmb_catalog_items for delete
to authenticated
using (exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()));

-- Create public image bucket.
insert into storage.buckets (id, name, public)
values ('jmb-catalog', 'jmb-catalog', true)
on conflict (id) do update set public = true;

drop policy if exists "public reads JMB catalog images" on storage.objects;
create policy "public reads JMB catalog images"
on storage.objects for select
to public
using (bucket_id = 'jmb-catalog');

drop policy if exists "JMB admins upload catalog images" on storage.objects;
create policy "JMB admins upload catalog images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'jmb-catalog'
  and exists (select 1 from public.jmb_admins a where a.user_id = auth.uid())
);

drop policy if exists "JMB admins update catalog images" on storage.objects;
create policy "JMB admins update catalog images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'jmb-catalog'
  and exists (select 1 from public.jmb_admins a where a.user_id = auth.uid())
);

drop policy if exists "JMB admins delete catalog images" on storage.objects;
create policy "JMB admins delete catalog images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'jmb-catalog'
  and exists (select 1 from public.jmb_admins a where a.user_id = auth.uid())
);

-- AFTER creating JMB's Supabase Auth user, run this once with that user's UUID:
-- insert into public.jmb_admins (user_id) values ('PASTE-ADMIN-AUTH-USER-UUID-HERE');
