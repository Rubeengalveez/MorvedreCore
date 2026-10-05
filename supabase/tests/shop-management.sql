begin;
select set_config('shop.qa_product',gen_random_uuid()::text,true);
insert into public.shop_products(id,title,description,category,price_cents,available,created_by)
values(current_setting('shop.qa_product')::uuid,'QA tienda oculto','Producto temporal de prueba','Accesorios',100,false,(select profile_id from public.profile_permissions where permission='manage_shop' limit 1));
insert into public.shop_product_images(product_id,url,alt,sort_order,is_cover)
values(current_setting('shop.qa_product')::uuid,'https://example.invalid/old.jpg','QA',0,true);
do $$
begin
  begin
    perform public.replace_shop_product_gallery(current_setting('shop.qa_product')::uuid,'[{"url":"https://example.invalid/bad.jpg","sort_order":2,"is_cover":true}]'::jsonb);
    raise exception 'QA: no rechazó un orden inválido';
  exception when others then
    if sqlerrm like 'QA:%' then raise; end if;
  end;
  if not exists(select 1 from public.shop_product_images where product_id=current_setting('shop.qa_product')::uuid and url='https://example.invalid/old.jpg') then raise exception 'QA: perdió la foto anterior'; end if;
  perform public.replace_shop_product_gallery(current_setting('shop.qa_product')::uuid,'[{"url":"https://example.invalid/new.jpg","storage_path":null,"alt":"QA","sort_order":0,"is_cover":true}]'::jsonb);
  perform public.replace_shop_product_gallery(current_setting('shop.qa_product')::uuid,'[]'::jsonb);
  if exists(select 1 from public.shop_product_images where product_id=current_setting('shop.qa_product')::uuid)
    or exists(select 1 from public.shop_products where id=current_setting('shop.qa_product')::uuid and image_url is not null)
  then raise exception 'QA: no quitó la última foto y su portada'; end if;
  perform public.replace_shop_product_gallery(current_setting('shop.qa_product')::uuid,'[{"url":"https://example.invalid/new.jpg","storage_path":null,"alt":"QA","sort_order":0,"is_cover":true}]'::jsonb);
end $$;
select set_config('request.jwt.claim.sub',(select p.auth_user_id::text from public.profiles p where p.auth_user_id is not null and not exists(select 1 from public.user_roles r where r.profile_id=p.id and r.role='admin') and not exists(select 1 from public.profile_permissions pp where pp.profile_id=p.id and pp.permission='manage_shop') limit 1),true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.shop_products where id=current_setting('shop.qa_product')::uuid) then raise exception 'QA: un socio pudo ver un producto oculto'; end if;
  if exists(select 1 from public.shop_product_images where product_id=current_setting('shop.qa_product')::uuid) then raise exception 'QA: un socio pudo ver una galería oculta'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select p.auth_user_id::text from public.profiles p join public.profile_permissions pp on pp.profile_id=p.id where pp.permission='manage_shop' and p.auth_user_id is not null limit 1),true);
set local role authenticated;
do $$ begin
  if not exists(select 1 from public.shop_products where id=current_setting('shop.qa_product')::uuid) then raise exception 'QA: Sol no ve los productos ocultos'; end if;
  if not exists(select 1 from public.shop_product_images where product_id=current_setting('shop.qa_product')::uuid) then raise exception 'QA: Sol no ve las fotos ocultas'; end if;
end $$;
select json_build_object('hidden_product_visible_to_manager',true,'hidden_gallery_visible_to_manager',true,'ordinary_member_hidden_access',false,'email_payload_readable',has_table_privilege('authenticated','public.shop_email_deliveries','SELECT'),'gallery_rpc_executable',has_function_privilege('authenticated','public.replace_shop_product_gallery(uuid,jsonb)','EXECUTE'),'gallery_failure_preserves_previous',true) as checks;
rollback;
