-- JMB 2 Creations Operational Phase 9
-- Shipping origin settings + Square hosted checkout + manual payment verification.
-- Run AFTER jmb-operational-phase4.sql.

alter table public.jmb_orders add column if not exists payment_method text check (payment_method is null or payment_method in ('Square','Zelle','PayPal','Venmo'));
alter table public.jmb_orders add column if not exists payment_submitted_at timestamptz;
alter table public.jmb_orders add column if not exists square_payment_link_id text;
alter table public.jmb_orders add column if not exists square_order_id text;
alter table public.jmb_orders add column if not exists square_payment_id text;

create unique index if not exists jmb_orders_square_order_idx on public.jmb_orders(square_order_id) where square_order_id is not null;

create table if not exists public.jmb_store_settings (
  id integer primary key default 1 check (id = 1),
  ship_from_name text not null default 'JMB 2 Creations',
  ship_from_street1 text not null default '',
  ship_from_street2 text,
  ship_from_city text not null default '',
  ship_from_state text not null default '',
  ship_from_zip text not null default '',
  ship_from_country text not null default 'US',
  updated_at timestamptz not null default now()
);

insert into public.jmb_store_settings(id) values (1) on conflict (id) do nothing;

alter table public.jmb_store_settings enable row level security;
drop policy if exists "JMB admins read store settings" on public.jmb_store_settings;
create policy "JMB admins read store settings" on public.jmb_store_settings for select to authenticated
using (exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()));
drop policy if exists "JMB admins update store settings" on public.jmb_store_settings;
create policy "JMB admins update store settings" on public.jmb_store_settings for update to authenticated
using (exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()));

grant select, update on public.jmb_store_settings to authenticated;

create table if not exists public.jmb_payment_settings (
  method text primary key check (method in ('Square','Zelle','PayPal','Venmo')),
  display_name text not null,
  detail_label text,
  payment_details text,
  instructions text,
  logo_url text,
  is_enabled boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.jmb_payment_settings(method, display_name, detail_label, payment_details, instructions, logo_url, is_enabled, sort_order)
values
  ('Square','Square','Secure online checkout',null,'Pay securely on Square. Payment confirmation is automatic.','https://cdn.simpleicons.org/square/3E4348',true,10),
  ('Zelle','Zelle','Send Zelle to',null,'Send the exact order total, then return to the site and press Payment Sent.','https://cdn.simpleicons.org/zelle/6D1ED4',true,20),
  ('PayPal','PayPal','Send PayPal to',null,'Send the exact order total, then return to the site and press Payment Sent.','https://cdn.simpleicons.org/paypal/003087',true,30),
  ('Venmo','Venmo','Send Venmo to',null,'Send the exact order total, then return to the site and press Payment Sent.','https://cdn.simpleicons.org/venmo/008CFF',true,40)
on conflict (method) do update set
  display_name = excluded.display_name,
  logo_url = coalesce(public.jmb_payment_settings.logo_url, excluded.logo_url),
  sort_order = excluded.sort_order;

alter table public.jmb_payment_settings enable row level security;
drop policy if exists "public reads enabled payment settings" on public.jmb_payment_settings;
create policy "public reads enabled payment settings" on public.jmb_payment_settings for select to anon, authenticated using (is_enabled = true or exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()));
drop policy if exists "JMB admins update payment settings" on public.jmb_payment_settings;
create policy "JMB admins update payment settings" on public.jmb_payment_settings for update to authenticated
using (exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()));

grant select on public.jmb_payment_settings to anon, authenticated;
grant update on public.jmb_payment_settings to authenticated;
