begin;
do $$
declare
 actor uuid;
 child uuid;
 p1 uuid := gen_random_uuid();
 p2 uuid := gen_random_uuid();
 token uuid := gen_random_uuid();
 response jsonb;
 replay jsonb;
 items jsonb;
 v_order_id uuid;
 count_before integer;
begin
 select id into actor from public.profiles where is_active and not public.profile_is_minor(id) limit 1;
 if actor is null then raise exception 'Falta perfil adulto de prueba.'; end if;
 update public.profiles set phone_e164='+34612345678' where id=actor;
 insert into public.shop_products(id,title,description,category,price_cents,sizes,available,created_by,personalization_enabled,personalization_max_length)
 values(p1,'QA Camiseta','Solo prueba transaccional','Camisetas',1999,array['M'],true,actor,true,10),
 (p2,'QA Toalla','Solo prueba transaccional','Accesorios',2999,'{}',true,actor,false,30);
 items := jsonb_build_array(jsonb_build_object('product_id',p1,'size','M','personalization','Juan','quantity',2),jsonb_build_object('product_id',p2,'size',null,'personalization',null,'quantity',1));
 select count(*) into count_before from public.shop_orders where requested_by=actor;
 begin
   perform public.submit_shop_checkout(actor,token,items,6996,null,null);
   raise exception 'QA_PRECIO_NO_BLOQUEADO';
 exception when others then if sqlerrm='QA_PRECIO_NO_BLOQUEADO' or sqlerrm not like '%precio ha cambiado%' then raise; end if;
 end;
 if (select count(*) from public.shop_orders where requested_by=actor)<>count_before then raise exception 'QA_PEDIDO_INCOMPLETO'; end if;
 begin
   perform public.submit_shop_checkout(actor,gen_random_uuid(),jsonb_set(items,'{0,size}','"XL"'),6997,null,null);
   raise exception 'QA_TALLA_NO_BLOQUEADA';
 exception when others then if sqlerrm='QA_TALLA_NO_BLOQUEADA' or sqlerrm not like '%talla válida%' then raise; end if;
 end;
 begin
   perform public.submit_shop_checkout(actor,gen_random_uuid(),jsonb_set(items,'{0,personalization}','null'),6997,null,null);
   raise exception 'QA_NOMBRE_NO_BLOQUEADO';
 exception when others then if sqlerrm='QA_NOMBRE_NO_BLOQUEADO' or sqlerrm not like '%nombre personalizado%' then raise; end if;
 end;
 response := public.submit_shop_checkout(actor,token,items,6997,'QA no entregar','+34698765432');
 v_order_id := (response->>'id')::uuid;
 if not (response->>'created')::boolean then raise exception 'QA_CREACION'; end if;
 if (select contact_phone_e164 from public.shop_orders where id=v_order_id)<>'+34698765432' then raise exception 'QA_CONTACTO_PEDIDO'; end if;
 if (select phone_e164 from public.profiles where id=actor)<>'+34612345678' then raise exception 'QA_CONTACTO_PERFIL'; end if;
 if (select total_cents from public.shop_orders where id=v_order_id)<>6997 then raise exception 'QA_TOTAL'; end if;
 if (select sum(subtotal_cents) from public.shop_order_items i where order_id=v_order_id)<>6997 then raise exception 'QA_PARCIALES'; end if;
 if (select count(*) from public.shop_order_items i where i.order_id=v_order_id)<>2 then raise exception 'QA_LINEAS'; end if;
 update public.shop_products set price_cents=4599,title='QA Nuevo nombre',available=false where id=p1;
 replay := public.submit_shop_checkout(actor,token,items,6997,null,null);
 if replay->>'id'<>response->>'id' or (replay->>'created')::boolean then raise exception 'QA_DUPLICADO'; end if;
 if (select count(*) from public.shop_orders where requested_by=actor)<>count_before+1 then raise exception 'QA_REINTENTO_DUPLICADO'; end if;
 if not exists(select 1 from public.shop_order_items i where i.order_id=v_order_id and product_id=p1 and product_title_snapshot='QA Camiseta' and unit_price_cents=1999) then raise exception 'QA_HISTORICO'; end if;
 begin
   perform public.submit_shop_checkout(actor,gen_random_uuid(),items,6997,null,null);
   raise exception 'QA_OCULTO_NO_BLOQUEADO';
 exception when others then if sqlerrm='QA_OCULTO_NO_BLOQUEADO' or sqlerrm not like '%no está disponible%' then raise; end if;
 end;
 update public.shop_products set available=true where id=p1;
 select p.id into child from public.profiles p where p.is_active and public.profile_is_minor(p.id) and exists(select 1 from public.parent_child_links where child_profile_id=p.id) limit 1;
 if child is null then raise exception 'Falta perfil menor vinculado para la prueba.'; end if;
 response := public.submit_shop_checkout(child,gen_random_uuid(),jsonb_build_array(jsonb_build_object('product_id',p2,'quantity',1)),2999,null,null);
 if not exists(select 1 from public.shop_orders where id=(response->>'id')::uuid and status='pending_parent' and guardian_approval_required and contact_phone_e164 is null) then raise exception 'QA_FAMILIA'; end if;
 if has_function_privilege('authenticated','public.submit_shop_checkout(uuid,uuid,jsonb,integer,text,text)','execute') or has_function_privilege('anon','public.submit_shop_checkout(uuid,uuid,jsonb,integer,text,text)','execute') or not has_function_privilege('service_role','public.submit_shop_checkout(uuid,uuid,jsonb,integer,text,text)','execute') then raise exception 'QA_PERMISOS'; end if;
end;
$$;
rollback;
select 'PASSED: totals, variants, idempotency, price changes, snapshots, hidden products, guardian approval, grants; all test data rolled back' as result;
