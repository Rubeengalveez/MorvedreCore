create or replace function public.replace_shop_product_gallery(p_product_id uuid, p_images jsonb)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if jsonb_typeof(p_images) <> 'array' or jsonb_array_length(p_images) < 1 or jsonb_array_length(p_images) > 8 then
    raise exception 'La galería debe tener entre 1 y 8 imágenes.';
  end if;
  perform 1 from public.shop_products where id = p_product_id for update;
  if not found then raise exception 'El producto ya no existe.'; end if;
  if (select count(*) from jsonb_array_elements(p_images) x where (x->>'is_cover')::boolean) <> 1 then
    raise exception 'Elige una sola imagen de portada.';
  end if;
  delete from public.shop_product_images where product_id = p_product_id;
  insert into public.shop_product_images(product_id,url,storage_path,alt,sort_order,is_cover)
  select p_product_id, x->>'url', x->>'storage_path', x->>'alt', (x->>'sort_order')::integer, (x->>'is_cover')::boolean
  from jsonb_array_elements(p_images) x;
  update public.shop_products set image_url = (select x->>'url' from jsonb_array_elements(p_images) x where (x->>'is_cover')::boolean), updated_at = now()
  where id = p_product_id;
end;
$$;
revoke all on function public.replace_shop_product_gallery(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.replace_shop_product_gallery(uuid,jsonb) to service_role;
