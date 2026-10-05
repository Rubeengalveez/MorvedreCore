alter table public.shop_products drop column if exists max_per_order;
update public.shop_products set category = case lower(category)
  when 'camisetas' then 'Camisetas' when 'pantalones' then 'Pantalones'
  when 'sudaderas' then 'Sudaderas' when 'bañadores' then 'Bañadores'
  else 'Accesorios' end;

create or replace function public.replace_shop_product_gallery(p_product_id uuid, p_images jsonb)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if p_images is null or jsonb_typeof(p_images) <> 'array' or jsonb_array_length(p_images) > 8 then
    raise exception 'La galería admite hasta 8 imágenes.';
  end if;
  perform 1 from public.shop_products where id = p_product_id for update;
  if not found then raise exception 'El producto ya no existe.'; end if;
  if jsonb_array_length(p_images) > 0 and (
    (select count(*) from jsonb_array_elements(p_images) x where (x->>'is_cover')::boolean) <> 1
    or not coalesce((p_images->0->>'is_cover')::boolean, false)
  ) then raise exception 'La primera foto debe ser la portada.'; end if;
  if exists (select 1 from jsonb_array_elements(p_images) with ordinality as x(value, position)
    where coalesce(value->>'url','') = '' or (value->>'sort_order')::integer is distinct from position - 1)
  then raise exception 'Revisa el orden y los datos de las fotos.'; end if;
  delete from public.shop_product_images where product_id = p_product_id;
  insert into public.shop_product_images(product_id,url,storage_path,alt,sort_order,is_cover)
  select p_product_id, x->>'url', x->>'storage_path', x->>'alt', (x->>'sort_order')::integer, coalesce((x->>'is_cover')::boolean,false)
  from jsonb_array_elements(p_images) x;
  update public.shop_products set image_url = p_images->0->>'url', updated_at = now() where id = p_product_id;
end;
$$;
revoke all on function public.replace_shop_product_gallery(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.replace_shop_product_gallery(uuid,jsonb) to service_role;
