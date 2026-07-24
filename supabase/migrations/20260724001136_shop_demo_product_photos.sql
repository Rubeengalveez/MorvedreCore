delete from public.shop_product_images as image
using public.shop_products as product
where image.product_id = product.id
  and product.title in (
    'Bañador masculino Waterpolo',
    'Bañador femenino Waterpolo',
    'Camiseta de entrenamiento'
  )
  and image.url = '/brand/logo.webp';

update public.shop_product_images
set is_cover = false
where product_id in (
  select id
  from public.shop_products
  where title in (
    'Bañador masculino Waterpolo',
    'Bañador femenino Waterpolo',
    'Camiseta de entrenamiento'
  )
)
  and is_cover;

with demo_images(image_id, product_title, url, alt, sort_order, is_cover) as (
  values
    (
      'd923346a-eb26-43c0-9b71-5d98734b3f60'::uuid,
      'Bañador masculino Waterpolo',
      '/shop/demo/banador-masculino-frontal.webp',
      'Vista frontal del bañador masculino de waterpolo',
      0,
      true
    ),
    (
      '7fbb020e-5bdd-4c99-9b26-ff9e1f5426ea'::uuid,
      'Bañador masculino Waterpolo',
      '/shop/demo/banador-masculino-trasera.webp',
      'Vista trasera del bañador masculino de waterpolo',
      1,
      false
    ),
    (
      'e161be4b-dcdf-4e1b-8ff9-72f029927db4'::uuid,
      'Bañador femenino Waterpolo',
      '/shop/demo/banador-femenino-frontal.webp',
      'Vista frontal del bañador femenino de waterpolo',
      0,
      true
    ),
    (
      'd74add77-a74f-49ca-abf8-b69d485945ba'::uuid,
      'Camiseta de entrenamiento',
      '/shop/demo/camiseta-entrenamiento-frontal.webp',
      'Vista frontal de la camiseta de entrenamiento',
      0,
      true
    ),
    (
      'b3a98af6-a27e-46a8-b0ad-bd81ac8a7775'::uuid,
      'Camiseta de entrenamiento',
      '/shop/demo/camiseta-entrenamiento-trasera.webp',
      'Vista trasera de la camiseta de entrenamiento',
      1,
      false
    )
)
insert into public.shop_product_images (
  id,
  product_id,
  url,
  storage_path,
  alt,
  sort_order,
  is_cover
)
select
  demo_images.image_id,
  product.id,
  demo_images.url,
  null,
  demo_images.alt,
  demo_images.sort_order,
  demo_images.is_cover
from demo_images
join public.shop_products as product
  on product.title = demo_images.product_title
on conflict (id) do update
set
  product_id = excluded.product_id,
  url = excluded.url,
  alt = excluded.alt,
  sort_order = excluded.sort_order,
  is_cover = excluded.is_cover;

with covers(product_title, url) as (
  values
    ('Bañador masculino Waterpolo', '/shop/demo/banador-masculino-frontal.webp'),
    ('Bañador femenino Waterpolo', '/shop/demo/banador-femenino-frontal.webp'),
    ('Camiseta de entrenamiento', '/shop/demo/camiseta-entrenamiento-frontal.webp')
)
update public.shop_products as product
set image_url = covers.url
from covers
where product.title = covers.product_title;
