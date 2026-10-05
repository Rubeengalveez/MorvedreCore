alter table public.shop_orders add column checkout_key uuid;
alter table public.shop_order_items add column product_title_snapshot text, add column product_image_snapshot text;
update public.shop_order_items item set product_title_snapshot=product.title, product_image_snapshot=product.image_url from public.shop_products product where product.id=item.product_id;
create unique index shop_orders_checkout_key_idx on public.shop_orders(requested_by, checkout_key) where checkout_key is not null;

create function public.submit_shop_checkout(p_requester uuid, p_checkout_key uuid, p_items jsonb, p_expected_total integer, p_notes text, p_contact_phone text)
returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare
  v_existing public.shop_orders%rowtype;
  v_profile public.profiles%rowtype;
  v_product public.shop_products%rowtype;
  v_item jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_total bigint := 0;
  v_quantity integer;
  v_size text;
  v_personalization text;
  v_minor boolean;
  v_order public.shop_orders%rowtype;
begin
  if p_checkout_key is null then raise exception 'No pudimos identificar el envío. Vuelve a revisar el carrito.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_requester::text || p_checkout_key::text,0));
  select * into v_existing from public.shop_orders where requested_by=p_requester and checkout_key=p_checkout_key;
  if found then return jsonb_build_object('id',v_existing.id,'order_reference',v_existing.order_reference,'created',false); end if;
  select * into v_profile from public.profiles where id=p_requester and is_active;
  if not found then raise exception 'No pudimos comprobar tu perfil.'; end if;
  v_minor := public.profile_is_minor(p_requester, (now() at time zone 'Europe/Madrid')::date);
  if v_minor and not exists(select 1 from public.parent_child_links where child_profile_id=p_requester) then
    raise exception 'Necesitas tener un tutor vinculado antes de enviar un pedido.';
  end if;
  if not v_minor and coalesce(v_profile.phone_e164,p_contact_phone,'') !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Añade un teléfono de contacto válido para enviar el pedido.';
  end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'Revisa los productos del carrito.';
  end if;
  if char_length(coalesce(p_notes,''))>500 then raise exception 'Las indicaciones admiten hasta 500 caracteres.'; end if;
  perform 1 from public.shop_products where id in (select (value->>'product_id')::uuid from jsonb_array_elements(p_items)) order by id for share;
  for v_item in select value from jsonb_array_elements(p_items) loop
    select * into v_product from public.shop_products where id=(v_item->>'product_id')::uuid and available;
    if not found then raise exception 'Un producto ya no está disponible. Actualiza el carrito.'; end if;
    if v_product.currency<>'EUR' then raise exception 'Este producto no tiene un precio válido en euros.'; end if;
    v_quantity := (v_item->>'quantity')::integer;
    if v_quantity is null or v_quantity<1 then raise exception 'Indica una cantidad entera de al menos una unidad.'; end if;
    v_size := nullif(btrim(v_item->>'size'),'');
    if cardinality(v_product.sizes)>0 and (v_size is null or not v_size=any(v_product.sizes)) then
      raise exception 'Selecciona una talla válida para %.',v_product.title;
    end if;
    if cardinality(v_product.sizes)=0 then v_size:=null; end if;
    v_personalization := case when v_product.personalization_enabled then nullif(btrim(v_item->>'personalization'),'') else null end;
    if v_product.personalization_enabled and (v_personalization is null or char_length(v_personalization)>v_product.personalization_max_length) then
      raise exception 'Revisa el nombre personalizado para %.',v_product.title;
    end if;
    v_total := v_total + v_product.price_cents::bigint*v_quantity;
    if v_total>2147483647 then raise exception 'El importe del pedido es demasiado grande. Divide el pedido.'; end if;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object('product_id',v_product.id,'size',v_size,'personalization',v_personalization,'quantity',v_quantity,'unit_price_cents',v_product.price_cents,'subtotal_cents',v_product.price_cents::bigint*v_quantity,'product_title_snapshot',v_product.title,'product_image_snapshot',v_product.image_url));
  end loop;
  if v_total is distinct from p_expected_total::bigint then
    raise exception 'El precio ha cambiado. Actualiza el carrito y revisa el nuevo total antes de confirmar.';
  end if;
  if not v_minor and v_profile.phone_e164 is null then update public.profiles set phone_e164=p_contact_phone where id=p_requester; end if;
  insert into public.shop_orders(requested_by,checkout_key,status,guardian_approval_required,total_cents,currency,notes,contact_phone_e164)
  values(p_requester,p_checkout_key,case when v_minor then 'pending_parent'::public.shop_order_status else 'pending_admin'::public.shop_order_status end,v_minor,v_total,'EUR',nullif(btrim(p_notes),''),case when v_minor then null else coalesce(v_profile.phone_e164,p_contact_phone) end) returning * into v_order;
  insert into public.shop_order_items(order_id,product_id,size,personalization,quantity,unit_price_cents,subtotal_cents,product_title_snapshot,product_image_snapshot)
  select v_order.id,(x->>'product_id')::uuid,x->>'size',x->>'personalization',(x->>'quantity')::integer,(x->>'unit_price_cents')::integer,(x->>'subtotal_cents')::integer,x->>'product_title_snapshot',x->>'product_image_snapshot' from jsonb_array_elements(v_lines) x;
  return jsonb_build_object('id',v_order.id,'order_reference',v_order.order_reference,'created',true);
end;
$$;
revoke all on function public.submit_shop_checkout(uuid,uuid,jsonb,integer,text,text) from public,anon,authenticated;
grant execute on function public.submit_shop_checkout(uuid,uuid,jsonb,integer,text,text) to service_role;
