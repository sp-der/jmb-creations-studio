begin;
do $test$
declare v_order uuid:=gen_random_uuid(); v_msg uuid; v_same uuid; v_token text; v_count integer;
begin
 insert into public.jmb_orders(id,order_number,first_name,last_name,customer_email,guest_token_hash,fulfillment,subtotal,total,status,payment_status,checkout_version,square_order_id)
 values(v_order,-1000001,'Deployment','Fixture','fixture@example.test',encode(extensions.digest(repeat('a',64),'sha256'),'hex'),'Local Pickup',25,25,'Pending Checkout','Unpaid',2,'fixture-square-'||v_order);
 if not public.jmb_valid_guest_order(v_order,repeat('a',64)) then raise exception 'Original token failed'; end if;
 if public.jmb_valid_guest_order(v_order,repeat('b',64)) then raise exception 'Invalid token accepted'; end if;
 v_token:=public.jmb_order_portal_token(v_order);
 if not public.jmb_valid_guest_order(v_order,v_token) then raise exception 'Supplemental token failed'; end if;
 if public.jmb_valid_guest_order(gen_random_uuid(),v_token) then raise exception 'Cross-order token accepted'; end if;
 begin
  update public.jmb_orders set status='In Production' where id=v_order;
  raise exception 'Unpaid fulfillment allowed';
 exception when raise_exception then if SQLERRM<>'Payment is required before fulfillment' then raise; end if; end;
 perform public.jmb_confirm_square_payment('fixture-square-'||v_order,'fixture-payment-'||v_order,2500,'USD',now());
 perform public.jmb_confirm_square_payment('fixture-square-'||v_order,'fixture-payment-'||v_order,2500,'USD',now());
 select count(*) into v_count from public.jmb_notification_outbox where order_id=v_order;
 if v_count<>2 then raise exception 'Duplicate payment notifications'; end if;
 v_msg:=gen_random_uuid();
 select (public.jmb_order_send(v_order,v_msg,'customer',null,'Fixture','Deployment SQL test')).id into v_same;
 if (select (public.jmb_order_send(v_order,v_msg,'customer',null,'Fixture','Deployment SQL test')).id)<>v_same then raise exception 'Message duplicated'; end if;
 if has_function_privilege('anon','public.jmb_order_send(uuid,uuid,text,uuid,text,text)','execute') then raise exception 'Public message RPC access'; end if;
 if has_table_privilege('authenticated','public.jmb_notification_outbox','select') then raise exception 'Public outbox access'; end if;
 if has_table_privilege('anon','public.jmb_order_messages','select') then raise exception 'Public chat access'; end if;
end $test$;
rollback;
select 'PASS: original/supplemental/swapped guest tokens, unpaid fulfillment guard, duplicate payment/messages, private API grants; all fixtures rolled back' as verification;