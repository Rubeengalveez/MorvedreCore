-- 0031_shop_product_images.sql
-- Galeria de imagenes para productos de tienda.

create table if not exists public.shop_product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.shop_products(id) on delete cascade,
  url text not null,
  storage_path text,
  alt text,
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists shop_product_images_product_order_idx
  on public.shop_product_images (product_id, sort_order, created_at);

create unique index if not exists shop_product_images_one_cover_idx
  on public.shop_product_images (product_id)
  where is_cover;

alter table public.shop_product_images enable row level security;

drop policy if exists shop_product_images_select_authenticated on public.shop_product_images;
create policy shop_product_images_select_authenticated
  on public.shop_product_images
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.shop_products p
      where p.id = shop_product_images.product_id
        and (p.available = true or public.is_admin())
    )
  );

drop policy if exists shop_product_images_admin_write on public.shop_product_images;
create policy shop_product_images_admin_write
  on public.shop_product_images
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
