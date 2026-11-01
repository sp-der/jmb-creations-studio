-- Recoverable deletion only: no customer, item, payment or message rows are removed.
alter table public.jmb_orders add column deleted_at timestamptz;
alter table public.jmb_orders add column deleted_by uuid references auth.users(id) on delete set null;
create index jmb_orders_active_created on public.jmb_orders(created_at desc) where deleted_at is null;
grant usage on schema jmb_private to service_role;
create table jmb_private.order_trash_events (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.jmb_orders(id),
 actor_user_id uuid references auth.users(id) on delete set null,
 action text not null check(action in ('delete','restore')), created_at timestamptz not null default now()
);
alter table jmb_private.order_trash_events enable row level security;
revoke all on jmb_private.order_trash_events from public,anon,authenticated;
grant all on jmb_private.order_trash_events to service_role;
revoke delete on public.jmb_orders from anon,authenticated;

create function public.jmb_order_trash(p_order_id uuid,p_user_id uuid,p_restore boolean default false)
returns public.jmb_orders language plpgsql security invoker set search_path=pg_catalog,pg_temp as $$
declare o public.jmb_orders;
begin
 if not exists(select 1 from public.jmb_admins where user_id=p_user_id) then raise exception 'Admin required'; end if;
 select * into o from public.jmb_orders where id=p_order_id for update;
 if not found then raise exception 'Order unavailable'; end if;
 if p_restore = (o.deleted_at is null) then return o; end if;
 -- Let already leased external operations finish before hiding the order.
 if o.checkout_lease_until>now() or exists(select 1 from public.jmb_notification_outbox where order_id=o.id and state='sending' and lease_until>now()) then
  raise exception 'Order is busy. Please retry in two minutes.';
 end if;
 update public.jmb_orders set deleted_at=case when p_restore then null else now() end,
 deleted_by=case when p_restore then null else p_user_id end where id=o.id returning * into o;
 insert into jmb_private.order_trash_events(order_id,actor_user_id,action) values(o.id,p_user_id,case when p_restore then 'restore' else 'delete' end);
 if not p_restore then
  update public.jmb_notification_outbox set state='needs_review',lease_until=null,
   last_error='Order moved to Trash. Notification suppressed; do not automatically resend after restore.'
   where order_id=o.id and state in ('pending','sending');
 end if;
 return o;
end $$;
revoke all on function public.jmb_order_trash(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.jmb_order_trash(uuid,uuid,boolean) to service_role;

create function jmb_private.guard_trashed_order() returns trigger language plpgsql security invoker set search_path=pg_catalog,pg_temp as $$
begin
 if old.deleted_at is not null and new.deleted_at is not null then
  -- Late verified payment webhooks still record money received, without restarting fulfillment.
  if new.payment_status='Paid' and old.payment_status<>'Paid' and new.square_payment_id is not null then new.status:=old.status; end if;
  if new.status is distinct from old.status or new.tracking_code is distinct from old.tracking_code or
   new.tracking_carrier is distinct from old.tracking_carrier or new.tracking_status is distinct from old.tracking_status or
   new.label_url is distinct from old.label_url or new.checkout_lease_id is distinct from old.checkout_lease_id then
   raise exception 'Restore this order from Trash before continuing fulfillment';
  end if;
 end if;
 return new;
end $$;
create trigger jmb_aa_guard_trash before update on public.jmb_orders for each row execute function jmb_private.guard_trashed_order();

create function jmb_private.guard_order_activity() returns trigger language plpgsql security definer set search_path=pg_catalog,pg_temp as $$
declare v_deleted timestamptz;
begin
 select deleted_at into v_deleted from public.jmb_orders where id=new.order_id for update;
 if v_deleted is not null then
  if tg_table_name='jmb_notification_outbox' then return null; end if;
  raise exception 'Restore this order from Trash before sending messages';
 end if;
 return new;
end $$;
revoke all on function jmb_private.guard_trashed_order(),jmb_private.guard_order_activity() from public,anon,authenticated;
create trigger jmb_guard_message_trash before insert on public.jmb_order_messages for each row execute function jmb_private.guard_order_activity();
create trigger jmb_guard_notification_trash before insert on public.jmb_notification_outbox for each row execute function jmb_private.guard_order_activity();

create or replace function public.jmb_claim_notifications(p_order_id uuid default null) returns setof public.jmb_notification_outbox
language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 update public.jmb_notification_outbox set state='needs_review',last_error='Idempotency window exceeded; reconcile with Resend before resending'
 where state in ('pending','sending') and first_attempt_at<now()-interval '23 hours' and (lease_until is null or lease_until<now());
 return query with jobs as (
 select n.id from public.jmb_notification_outbox n join public.jmb_orders o on o.id=n.order_id
 where o.deleted_at is null and n.state in ('pending','sending') and n.next_attempt_at<=now()
 and (n.lease_until is null or n.lease_until<now()) and (p_order_id is null or n.order_id=p_order_id)
 order by n.created_at for update of n skip locked limit 5
 ) update public.jmb_notification_outbox n set state='sending',lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes',attempts=n.attempts+1
 from jobs where n.id=jobs.id returning n.*;
end $$;

-- Restrict legacy guest RPCs as well as the current Edge endpoints.
-- Their existing token checks and return signatures remain intact.
create or replace function public.jmb_guest_get_order(p_order_id uuid, p_token text)
returns table (
  id uuid, order_number bigint, customer_user_id uuid, first_name text, last_name text, customer_email text,
  fulfillment text, address1 text, address2 text, city text, state text, postal_code text, country text,
  subtotal numeric, shipping_amount numeric, tax_amount numeric, discount_amount numeric, total numeric,
  status text, payment_status text, easypost_shipment_id text, easypost_rate_id text, label_url text,
  tracking_code text, tracking_carrier text, tracking_status text, created_at timestamptz, updated_at timestamptz
)
language sql security definer set search_path = public, pg_temp
as $$
 select o.id, o.order_number, o.customer_user_id, o.first_name, o.last_name, o.customer_email,
        o.fulfillment, o.address1, o.address2, o.city, o.state, o.postal_code, o.country,
        o.subtotal, o.shipping_amount, o.tax_amount, o.discount_amount, o.total,
        o.status, o.payment_status, o.easypost_shipment_id, o.easypost_rate_id, o.label_url,
        o.tracking_code, o.tracking_carrier, o.tracking_status, o.created_at, o.updated_at
 from public.jmb_orders o
 where o.deleted_at is null and o.id = p_order_id and o.guest_token_hash = encode(extensions.digest(p_token,'sha256'),'hex')
 limit 1
$$;

create or replace function public.jmb_guest_get_order_items(p_order_id uuid, p_token text)
returns table (id uuid, order_id uuid, catalog_item_id uuid, name text, option text, team text, quantity integer, unit_price numeric, line_total numeric, image_url text)
language sql security definer set search_path = public, pg_temp
as $$
 select i.id, i.order_id, i.catalog_item_id, i.name, i.option, i.team, i.quantity, i.unit_price, i.line_total, i.image_url
 from public.jmb_order_items i
 where i.order_id = p_order_id
   and exists (select 1 from public.jmb_orders o where o.deleted_at is null and o.id = p_order_id and o.guest_token_hash = encode(extensions.digest(p_token,'sha256'),'hex'))
 order by i.created_at asc
$$;


-- Hold an operational lease across external label purchases / manual payment review.
-- Deletion waits for this lease, so a request already in flight cannot notify after deletion.
create function public.jmb_order_operation_lock(p_order_id uuid) returns uuid
language plpgsql security invoker set search_path=pg_catalog,pg_temp as $$
declare o public.jmb_orders; v_lease uuid:=gen_random_uuid();
begin
 select * into o from public.jmb_orders where id=p_order_id for update;
 if not found or o.deleted_at is not null then raise exception 'Restore this order from Trash before continuing'; end if;
 if o.checkout_lease_until>now() then raise exception 'Order is busy. Retry shortly.'; end if;
 update public.jmb_orders set checkout_lease_id=v_lease,checkout_lease_until=now()+interval '10 minutes' where id=o.id;
 return v_lease;
end $$;
revoke all on function public.jmb_order_operation_lock(uuid) from public,anon,authenticated;
grant execute on function public.jmb_order_operation_lock(uuid) to service_role;
