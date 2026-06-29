-- 0028_shop.sql
-- Fase 5: Tienda
-- Tablas: shop_products, shop_orders, shop_order_items
-- Flujo: player -> solicita -> parent aprueba -> admin gestiona kanban
-- Storage: bucket shop-images para fotos de productos

create table public.shop_products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  category text not null,
  price_cents integer not null check (price_cents > 0),
  currency text not null default 'EUR',
  image_url text,
  sizes text[] not null default '{}',
  available boolean not null default true,
  stock integer,
  max_per_order integer not null default 10,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shop_products_category_idx on public.shop_products (category);
create index shop_products_available_idx on public.shop_products (available);
create index shop_products_created_at_idx on public.shop_products (created_at desc);

create trigger shop_products_set_updated_at
  before update on public.shop_products
  for each row execute function public.set_updated_at();

-- Tabla de pedidos
create type public.shop_order_status as enum (
  'pending_parent',
  'pending_admin',
  'rejected',
  'ordered',
  'received',
  'delivered',
  'cancelled'
);

create table public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.profiles(id) on delete cascade,
  approved_by uuid references public.profiles(id),
  managed_by uuid references public.profiles(id),
  status public.shop_order_status not null default 'pending_parent',
  total_cents integer not null default 0,
  currency text not null default 'EUR',
  notes text,
  parent_notes text,
  admin_notes text,
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  ordered_at timestamptz,
  received_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now()
);

create index shop_orders_requested_by_idx on public.shop_orders (requested_by);
create index shop_orders_status_idx on public.shop_orders (status);
create index shop_orders_requested_at_idx on public.shop_orders (requested_at desc);

create trigger shop_orders_set_updated_at
  before update on public.shop_orders
  for each row execute function public.set_updated_at();

-- Tabla de items del pedido
create table public.shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.shop_orders(id) on delete cascade,
  product_id uuid not null references public.shop_products(id),
  size text,
  quantity integer not null check (quantity > 0),
  unit_price_cents integer not null,
  subtotal_cents integer not null,
  created_at timestamptz not null default now()
);

create index shop_order_items_order_id_idx on public.shop_order_items (order_id);
create index shop_order_items_product_id_idx on public.shop_order_items (product_id);

-- RLS
alter table public.shop_products enable row level security;
alter table public.shop_orders enable row level security;
alter table public.shop_order_items enable row level security;

-- Productos: lectura para todos los autenticados
drop policy if exists shop_products_select_authenticated on public.shop_products;
create policy shop_products_select_authenticated
  on public.shop_products
  for select
  to authenticated
  using (available = true or public.is_admin());

-- Productos: solo admin puede escribir
drop policy if exists shop_products_admin_write on public.shop_products;
create policy shop_products_admin_write
  on public.shop_products
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Pedidos: el solicitante o su parent o admin pueden ver
drop policy if exists shop_orders_select on public.shop_orders;
create policy shop_orders_select
  on public.shop_orders
  for select
  to authenticated
  using (
    requested_by = (select id from public.profiles where auth_user_id = auth.uid())
    or approved_by = (select id from public.profiles where auth_user_id = auth.uid())
    or public.is_admin()
    or exists (
      select 1 from public.parent_child_links pcl
      where pcl.parent_profile_id = (select id from public.profiles where auth_user_id = auth.uid())
        and pcl.child_profile_id = shop_orders.requested_by
    )
  );

-- Pedidos: el solicitante puede crear (con status pending_parent)
drop policy if exists shop_orders_insert_self on public.shop_orders;
create policy shop_orders_insert_self
  on public.shop_orders
  for insert
  to authenticated
  with check (
    requested_by = (select id from public.profiles where auth_user_id = auth.uid())
    and status = 'pending_parent'
  );

-- Pedidos: solo parent o admin pueden actualizar
drop policy if exists shop_orders_update_parent on public.shop_orders;
create policy shop_orders_update_parent
  on public.shop_orders
  for update
  to authenticated
  using (
    exists (
      select 1 from public.parent_child_links pcl
      where pcl.parent_profile_id = (select id from public.profiles where auth_user_id = auth.uid())
        and pcl.child_profile_id = shop_orders.requested_by
    )
    or public.is_admin()
  )
  with check (
    exists (
      select 1 from public.parent_child_links pcl
      where pcl.parent_profile_id = (select id from public.profiles where auth_user_id = auth.uid())
        and pcl.child_profile_id = shop_orders.requested_by
    )
    or public.is_admin()
  );

-- Items: visibles si el pedido es visible
drop policy if exists shop_order_items_select on public.shop_order_items;
create policy shop_order_items_select
  on public.shop_order_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.shop_orders o
      where o.id = shop_order_items.order_id
    )
  );

-- Items: insert por el solicitante
drop policy if exists shop_order_items_insert_self on public.shop_order_items;
create policy shop_order_items_insert_self
  on public.shop_order_items
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.shop_orders o
      where o.id = shop_order_items.order_id
        and o.requested_by = (select id from public.profiles where auth_user_id = auth.uid())
        and o.status = 'pending_parent'
    )
  );

-- Items: update solo admin (para cambiar stock)
drop policy if exists shop_order_items_admin_update on public.shop_order_items;
create policy shop_order_items_admin_update
  on public.shop_order_items
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Bucket de storage para imágenes de productos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shop-images',
  'shop-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists shop_images_select on storage.objects;
create policy shop_images_select on storage.objects for select to authenticated using (bucket_id = 'shop-images');

drop policy if exists shop_images_insert on storage.objects;
create policy shop_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'shop-images' and (storage.foldername(name))[1] = 'shop' and public.is_admin());

drop policy if exists shop_images_update on storage.objects;
create policy shop_images_update on storage.objects for update to authenticated
  using (bucket_id = 'shop-images' and public.is_admin())
  with check (bucket_id = 'shop-images' and public.is_admin());

drop policy if exists shop_images_delete on storage.objects;
create policy shop_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'shop-images' and public.is_admin());
