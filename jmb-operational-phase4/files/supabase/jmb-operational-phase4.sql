-- JMB 2 Creations Operational Phase 4
-- Guest/account ordering, secure guest links, editable design names, shipping fields, invoices.
-- Run AFTER:
--   1) jmb-catalog-phase2.sql
--   2) jmb-operations-phase3.sql

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Live catalog: parcel metadata used for live shipping rates.
-- -----------------------------------------------------------------------------
alter table public.jmb_catalog_items add column if not exists weight_oz numeric(10,2) check (weight_oz is null or weight_oz >= 0);
alter table public.jmb_catalog_items add column if not exists length_in numeric(10,2) check (length_in is null or length_in >= 0);
alter table public.jmb_catalog_items add column if not exists width_in numeric(10,2) check (width_in is null or width_in >= 0);
alter table public.jmb_catalog_items add column if not exists height_in numeric(10,2) check (height_in is null or height_in >= 0);

-- -----------------------------------------------------------------------------
-- Editable display names for the static/image catalog designs.
-- -----------------------------------------------------------------------------
create table if not exists public.jmb_design_labels (
  id uuid primary key default gen_random_uuid(),
  family_slug text not null,
  design_id text not null,
  display_name text not null check (length(trim(display_name)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_slug, design_id)
);

drop trigger if exists jmb_design_labels_touch on public.jmb_design_labels;
create trigger jmb_design_labels_touch before update on public.jmb_design_labels
for each row execute function public.jmb_touch_updated_at();

alter table public.jmb_design_labels enable row level security;

drop policy if exists "public reads JMB design labels" on public.jmb_design_labels;
create policy "public reads JMB design labels" on public.jmb_design_labels
for select to anon, authenticated using (true);

drop policy if exists "JMB admins insert design labels" on public.jmb_design_labels;
create policy "JMB admins insert design labels" on public.jmb_design_labels
for insert to authenticated with check (exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()));

drop policy if exists "JMB admins update design labels" on public.jmb_design_labels;
create policy "JMB admins update design labels" on public.jmb_design_labels
for update to authenticated using (exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()));

drop policy if exists "JMB admins delete design labels" on public.jmb_design_labels;
create policy "JMB admins delete design labels" on public.jmb_design_labels
for delete to authenticated using (exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()));

-- -----------------------------------------------------------------------------
-- Custom requests: allow secure guest requests in addition to signed-in accounts.
-- -----------------------------------------------------------------------------
alter table public.jmb_custom_requests alter column customer_user_id drop not null;
alter table public.jmb_custom_requests add column if not exists first_name text;
alter table public.jmb_custom_requests add column if not exists last_name text;
alter table public.jmb_custom_requests add column if not exists is_guest boolean not null default false;
alter table public.jmb_custom_requests add column if not exists guest_token_hash text;

create index if not exists jmb_custom_requests_guest_idx on public.jmb_custom_requests(id, guest_token_hash) where is_guest = true;

create or replace function public.jmb_token_hash(p_token text)
returns text
language sql
immutable
strict
as $$ select encode(digest(p_token, 'sha256'), 'hex') $$;

-- These SECURITY DEFINER functions reveal only rows matching both UUID + private token.
create or replace function public.jmb_guest_get_custom_request(p_request_id uuid, p_token text)
returns table (
  id uuid, request_number bigint, customer_user_id uuid, customer_name text, customer_email text,
  first_name text, last_name text, product_family text, idea text, colors text, size text,
  quantity integer, fulfillment text, status text, quote numeric, is_guest boolean,
  created_at timestamptz, updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select r.id, r.request_number, r.customer_user_id, r.customer_name, r.customer_email,
         r.first_name, r.last_name, r.product_family, r.idea, r.colors, r.size,
         r.quantity, r.fulfillment, r.status, r.quote, r.is_guest, r.created_at, r.updated_at
  from public.jmb_custom_requests r
  where r.id = p_request_id
    and r.is_guest = true
    and r.guest_token_hash = public.jmb_token_hash(p_token)
  limit 1
$$;

create or replace function public.jmb_guest_get_custom_messages(p_request_id uuid, p_token text)
returns table (id uuid, request_id uuid, sender text, sender_user_id uuid, body text, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select m.id, m.request_id, m.sender, m.sender_user_id, m.body, m.created_at
  from public.jmb_custom_messages m
  where m.request_id = p_request_id
    and exists (
      select 1 from public.jmb_custom_requests r
      where r.id = p_request_id and r.is_guest = true
        and r.guest_token_hash = public.jmb_token_hash(p_token)
    )
  order by m.created_at asc
$$;

create or replace function public.jmb_guest_send_custom_message(p_request_id uuid, p_token text, p_body text)
returns table (id uuid, request_id uuid, sender text, sender_user_id uuid, body text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if length(trim(coalesce(p_body, ''))) = 0 then raise exception 'Message cannot be empty'; end if;
  if not exists (
    select 1 from public.jmb_custom_requests r
    where r.id = p_request_id and r.is_guest = true
      and r.guest_token_hash = public.jmb_token_hash(p_token)
  ) then raise exception 'Invalid guest request link'; end if;
  insert into public.jmb_custom_messages(request_id, sender, sender_user_id, body)
  values (p_request_id, 'customer', null, trim(p_body)) returning jmb_custom_messages.id into v_id;
  return query select m.id, m.request_id, m.sender, m.sender_user_id, m.body, m.created_at
  from public.jmb_custom_messages m where m.id = v_id;
end;
$$;

revoke all on function public.jmb_guest_get_custom_request(uuid,text) from public;
revoke all on function public.jmb_guest_get_custom_messages(uuid,text) from public;
revoke all on function public.jmb_guest_send_custom_message(uuid,text,text) from public;
grant execute on function public.jmb_guest_get_custom_request(uuid,text) to anon, authenticated;
grant execute on function public.jmb_guest_get_custom_messages(uuid,text) to anon, authenticated;
grant execute on function public.jmb_guest_send_custom_message(uuid,text,text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Standard storefront orders: signed-in customers + guest customers.
-- -----------------------------------------------------------------------------
create table if not exists public.jmb_orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated by default as identity unique,
  customer_user_id uuid references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  customer_email text not null,
  guest_token_hash text,
  fulfillment text not null check (fulfillment in ('Shipping','Local Pickup')),
  address1 text,
  address2 text,
  city text,
  state text,
  postal_code text,
  country text default 'US',
  subtotal numeric(10,2) not null default 0 check (subtotal >= 0),
  shipping_amount numeric(10,2) not null default 0 check (shipping_amount >= 0),
  tax_amount numeric(10,2) not null default 0 check (tax_amount >= 0),
  discount_amount numeric(10,2) not null default 0 check (discount_amount >= 0),
  total numeric(10,2) not null default 0 check (total >= 0),
  status text not null default 'Order Received' check (status in ('Order Received','Payment Confirmed','In Production','Ready for Pickup','Shipped','Completed','Cancelled')),
  payment_status text not null default 'Unpaid' check (payment_status in ('Unpaid','Pending','Paid','Refunded')),
  easypost_shipment_id text,
  easypost_rate_id text,
  label_url text,
  tracking_code text,
  tracking_carrier text,
  tracking_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jmb_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.jmb_orders(id) on delete cascade,
  catalog_item_id uuid references public.jmb_catalog_items(id) on delete set null,
  name text not null,
  option text,
  team text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null check (unit_price >= 0),
  line_total numeric(10,2) not null check (line_total >= 0),
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists jmb_orders_customer_idx on public.jmb_orders(customer_user_id, created_at desc);
create index if not exists jmb_orders_guest_idx on public.jmb_orders(id, guest_token_hash) where guest_token_hash is not null;
create index if not exists jmb_order_items_order_idx on public.jmb_order_items(order_id, created_at);

drop trigger if exists jmb_orders_touch on public.jmb_orders;
create trigger jmb_orders_touch before update on public.jmb_orders for each row execute function public.jmb_touch_updated_at();

alter table public.jmb_orders enable row level security;
alter table public.jmb_order_items enable row level security;

drop policy if exists "customers read own JMB orders" on public.jmb_orders;
create policy "customers read own JMB orders" on public.jmb_orders for select to authenticated
using (customer_user_id = auth.uid() or exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()));

drop policy if exists "JMB admins update orders" on public.jmb_orders;
create policy "JMB admins update orders" on public.jmb_orders for update to authenticated
using (exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()));

drop policy if exists "customers read own JMB order items" on public.jmb_order_items;
create policy "customers read own JMB order items" on public.jmb_order_items for select to authenticated
using (exists (
  select 1 from public.jmb_orders o
  where o.id = order_id and (o.customer_user_id = auth.uid() or exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()))
));

create or replace function public.jmb_guest_get_order(p_order_id uuid, p_token text)
returns table (
  id uuid, order_number bigint, customer_user_id uuid, first_name text, last_name text, customer_email text,
  fulfillment text, address1 text, address2 text, city text, state text, postal_code text, country text,
  subtotal numeric, shipping_amount numeric, tax_amount numeric, discount_amount numeric, total numeric,
  status text, payment_status text, easypost_shipment_id text, easypost_rate_id text, label_url text,
  tracking_code text, tracking_carrier text, tracking_status text, created_at timestamptz, updated_at timestamptz
)
language sql security definer set search_path = public
as $$
 select o.id, o.order_number, o.customer_user_id, o.first_name, o.last_name, o.customer_email,
        o.fulfillment, o.address1, o.address2, o.city, o.state, o.postal_code, o.country,
        o.subtotal, o.shipping_amount, o.tax_amount, o.discount_amount, o.total,
        o.status, o.payment_status, o.easypost_shipment_id, o.easypost_rate_id, o.label_url,
        o.tracking_code, o.tracking_carrier, o.tracking_status, o.created_at, o.updated_at
 from public.jmb_orders o
 where o.id = p_order_id and o.guest_token_hash = public.jmb_token_hash(p_token)
 limit 1
$$;

create or replace function public.jmb_guest_get_order_items(p_order_id uuid, p_token text)
returns table (id uuid, order_id uuid, catalog_item_id uuid, name text, option text, team text, quantity integer, unit_price numeric, line_total numeric, image_url text)
language sql security definer set search_path = public
as $$
 select i.id, i.order_id, i.catalog_item_id, i.name, i.option, i.team, i.quantity, i.unit_price, i.line_total, i.image_url
 from public.jmb_order_items i
 where i.order_id = p_order_id
   and exists (select 1 from public.jmb_orders o where o.id = p_order_id and o.guest_token_hash = public.jmb_token_hash(p_token))
 order by i.created_at asc
$$;

revoke all on function public.jmb_guest_get_order(uuid,text) from public;
revoke all on function public.jmb_guest_get_order_items(uuid,text) from public;
grant execute on function public.jmb_guest_get_order(uuid,text) to anon, authenticated;
grant execute on function public.jmb_guest_get_order_items(uuid,text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- JMB custom invoice maker.
-- -----------------------------------------------------------------------------
create table if not exists public.jmb_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number bigint generated by default as identity unique,
  custom_request_id uuid references public.jmb_custom_requests(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  status text not null default 'Draft' check (status in ('Draft','Sent','Paid','Void')),
  subtotal numeric(10,2) not null default 0,
  shipping_amount numeric(10,2) not null default 0,
  tax_amount numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jmb_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.jmb_invoices(id) on delete cascade,
  line_type text not null,
  description text not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(10,2) not null default 0 check (unit_price >= 0),
  line_total numeric(10,2) not null default 0 check (line_total >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists jmb_invoice_lines_invoice_idx on public.jmb_invoice_lines(invoice_id, sort_order);
drop trigger if exists jmb_invoices_touch on public.jmb_invoices;
create trigger jmb_invoices_touch before update on public.jmb_invoices for each row execute function public.jmb_touch_updated_at();

alter table public.jmb_invoices enable row level security;
alter table public.jmb_invoice_lines enable row level security;

-- Invoices are managed by JMB. Customer delivery happens by email.
drop policy if exists "JMB admins manage invoices" on public.jmb_invoices;
create policy "JMB admins manage invoices" on public.jmb_invoices for all to authenticated
using (exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()));

drop policy if exists "JMB admins manage invoice lines" on public.jmb_invoice_lines;
create policy "JMB admins manage invoice lines" on public.jmb_invoice_lines for all to authenticated
using (exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.jmb_admins a where a.user_id = auth.uid()));

-- Helpful grants for PostgREST. RLS still controls actual row access.
grant select on public.jmb_design_labels to anon, authenticated;
grant select, insert, update, delete on public.jmb_design_labels to authenticated;
grant select, update on public.jmb_orders to authenticated;
grant select on public.jmb_order_items to authenticated;
grant all on public.jmb_invoices, public.jmb_invoice_lines to authenticated;

-- Atomic stock reservation used by the server-side order function.
create or replace function public.jmb_reserve_catalog_stock(p_item_id uuid, p_quantity integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_quantity <= 0 then raise exception 'Quantity must be positive'; end if;
  update public.jmb_catalog_items
  set stock = stock - p_quantity
  where id = p_item_id and active = true and made_to_order = false and stock >= p_quantity;
  if found then return; end if;
  if exists (select 1 from public.jmb_catalog_items where id = p_item_id and active = true and made_to_order = true) then return; end if;
  raise exception 'Not enough stock available';
end;
$$;
revoke all on function public.jmb_reserve_catalog_stock(uuid,integer) from public, anon, authenticated;
grant execute on function public.jmb_reserve_catalog_stock(uuid,integer) to service_role;

-- Transactional server-only order creation. Catalog prices and stock are always
-- read from the database, never trusted from the browser.
create or replace function public.jmb_create_storefront_order(
  p_customer_user_id uuid,
  p_first_name text,
  p_last_name text,
  p_customer_email text,
  p_guest_token_hash text,
  p_fulfillment text,
  p_address1 text,
  p_address2 text,
  p_city text,
  p_state text,
  p_postal_code text,
  p_country text,
  p_shipping_amount numeric,
  p_easypost_shipment_id text,
  p_easypost_rate_id text,
  p_items jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_subtotal numeric(10,2) := 0;
  v_entry jsonb;
  v_item public.jmb_catalog_items%rowtype;
  v_qty integer;
begin
  if p_fulfillment not in ('Shipping','Local Pickup') then raise exception 'Invalid fulfillment method'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Order has no items'; end if;

  -- Validate and lock every item before anything is inserted.
  for v_entry in select value from jsonb_array_elements(p_items)
  loop
    v_qty := greatest(1, coalesce((v_entry->>'quantity')::integer, 1));
    select * into v_item from public.jmb_catalog_items
    where id = (v_entry->>'catalog_item_id')::uuid and active = true
    for update;
    if not found then raise exception 'A catalog item is no longer available'; end if;
    if not v_item.made_to_order and v_item.stock < v_qty then raise exception '% does not have enough ready stock', v_item.name; end if;
    v_subtotal := v_subtotal + (v_item.price * v_qty);
  end loop;

  insert into public.jmb_orders(
    customer_user_id, first_name, last_name, customer_email, guest_token_hash,
    fulfillment, address1, address2, city, state, postal_code, country,
    subtotal, shipping_amount, tax_amount, discount_amount, total,
    status, payment_status, easypost_shipment_id, easypost_rate_id
  ) values (
    p_customer_user_id, trim(p_first_name), trim(p_last_name), lower(trim(p_customer_email)), p_guest_token_hash,
    p_fulfillment, p_address1, p_address2, p_city, p_state, p_postal_code, coalesce(p_country,'US'),
    v_subtotal, greatest(0,coalesce(p_shipping_amount,0)), 0, 0, v_subtotal + greatest(0,coalesce(p_shipping_amount,0)),
    'Order Received', 'Unpaid', p_easypost_shipment_id, p_easypost_rate_id
  ) returning id into v_order_id;

  for v_entry in select value from jsonb_array_elements(p_items)
  loop
    v_qty := greatest(1, coalesce((v_entry->>'quantity')::integer, 1));
    select * into v_item from public.jmb_catalog_items where id = (v_entry->>'catalog_item_id')::uuid;
    insert into public.jmb_order_items(order_id, catalog_item_id, name, option, team, quantity, unit_price, line_total, image_url)
    values (v_order_id, v_item.id, v_item.name, v_item.size, v_item.team, v_qty, v_item.price, v_item.price * v_qty, v_item.image_url);
    if not v_item.made_to_order then
      update public.jmb_catalog_items set stock = stock - v_qty where id = v_item.id;
    end if;
  end loop;

  return v_order_id;
end;
$$;
revoke all on function public.jmb_create_storefront_order(uuid,text,text,text,text,text,text,text,text,text,text,text,numeric,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.jmb_create_storefront_order(uuid,text,text,text,text,text,text,text,text,text,text,text,numeric,text,text,jsonb) to service_role;
