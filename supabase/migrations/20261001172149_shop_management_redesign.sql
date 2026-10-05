drop policy if exists shop_products_select on public.shop_products;
create policy shop_products_select on public.shop_products
for select to authenticated
using (available = true or public.has_permission('manage_shop'));
