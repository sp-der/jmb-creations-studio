-- Admin-only permanent deletion. Apply to JMB2C after the Trash migration.
-- Provider-side Square/Resend/EasyPost records are intentionally unaffected.
create or replace function public.jmb_order_purge(p_order_id uuid, p_user_id uuid, p_order_number bigint)
returns boolean language plpgsql security invoker set search_path=pg_catalog,pg_temp as $$
declare o public.jmb_orders;
begin
 if not exists (select 1 from public.jmb_admins where user_id=p_user_id) then raise exception 'Admin required'; end if;
 select * into o from public.jmb_orders where id=p_order_id for update;
 if not found then raise exception 'Order unavailable'; end if;
 if o.deleted_at is null then raise exception 'Move order to Trash first'; end if;
 if o.order_number is distinct from p_order_number then raise exception 'Order confirmation does not match'; end if;
 if o.checkout_lease_until>now() or exists(select 1 from public.jmb_notification_outbox
   where order_id=o.id and state='sending' and lease_until>now()) then
   raise exception 'Order is busy. Please retry later';
 end if;
 delete from public.jmb_notification_outbox where order_id=o.id;
 delete from public.jmb_order_messages where order_id=o.id;
 delete from jmb_private.order_tokens where order_id=o.id;
 delete from jmb_private.order_trash_events where order_id=o.id;
 delete from public.jmb_orders where id=o.id;
 return true;
end $$;
revoke all on function public.jmb_order_purge(uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.jmb_order_purge(uuid,uuid,bigint) to service_role;
