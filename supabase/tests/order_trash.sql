-- Production-safe transactional smoke test. No auth accounts, provider calls or persistent data.
begin;
set local role service_role;
do $$
declare a uuid; o public.jmb_orders; v_id uuid; v_payment text; v_lease uuid;
begin
 select user_id into a from public.jmb_admins limit 1;
 if a is null then raise exception 'A configured administrator is required'; end if;
 insert into public.jmb_orders(first_name,last_name,customer_email,fulfillment,status,payment_status,checkout_version,square_payment_id)
 values('Deployment','Test','delivered@resend.dev','Local Pickup','Payment Confirmed','Paid',1,'smoke-test-no-provider-record') returning * into o;
 insert into public.jmb_order_items(order_id,name,quantity,unit_price,line_total) values(o.id,'Smoke test only',1,1,1);
 perform public.jmb_order_send(o.id,gen_random_uuid(),'admin',a,'JMB deployment test','Transactional test only; rolled back without email.');
 v_lease:=public.jmb_order_operation_lock(o.id);
 begin
  perform public.jmb_order_trash(o.id,a,false);
  raise exception 'FAIL: deletion did not wait for operation lease';
 exception when raise_exception then
  if SQLERRM not like '%busy%' then raise; end if;
 end;
 update public.jmb_orders set checkout_lease_until=null where id=o.id and checkout_lease_id=v_lease;
 perform public.jmb_order_trash(o.id,a,false);
 if not exists(select 1 from public.jmb_orders where id=o.id and deleted_at is not null and payment_status='Paid' and square_payment_id=o.square_payment_id) then raise exception 'FAIL: payment preservation'; end if;
 if (select count(*) from public.jmb_order_items where order_id=o.id)<>1 then raise exception 'FAIL: item preservation'; end if;
 if (select count(*) from public.jmb_order_messages where order_id=o.id)<>1 then raise exception 'FAIL: chat preservation'; end if;
 if exists(select 1 from public.jmb_claim_notifications(o.id)) then raise exception 'FAIL: deleted notification claimed'; end if;
 begin
  perform public.jmb_order_send(o.id,gen_random_uuid(),'customer',null,'Test','Blocked');
  raise exception 'FAIL: deleted message accepted';
 exception when raise_exception then
  if SQLERRM not like '%Restore%' then raise; end if;
 end;
 perform public.jmb_order_trash(o.id,a,true);
 if not exists(select 1 from public.jmb_orders where id=o.id and deleted_at is null) then raise exception 'FAIL: restore'; end if;
 if (select count(*) from jmb_private.order_trash_events where order_id=o.id)<>2 then raise exception 'FAIL: audit'; end if;
end $$;
reset role;
select 'PASS: production service-role delete/restore, leases, payment/item/chat preservation, queue suppression' result;
rollback;
