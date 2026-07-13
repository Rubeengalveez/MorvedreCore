drop policy if exists profiles_select_pii_self_admin on public.profiles;
drop policy if exists profiles_select_authenticated on public.profiles;

create policy profiles_select_authenticated
  on public.profiles
  for select
  to authenticated
  using (true);

revoke select on public.profiles from authenticated;
grant select (
  id,
  auth_user_id,
  full_name,
  photo_url,
  birth_year,
  gender,
  cap_number,
  license_active,
  team_color,
  school_enrolled,
  created_at,
  updated_at
) on public.profiles to authenticated;

revoke insert, update, delete on public.profiles from authenticated;

drop policy if exists "Anon can submit access requests" on public.access_requests;
drop policy if exists "Authenticated can submit own access requests" on public.access_requests;
revoke insert, update, delete on public.access_requests from anon, authenticated;
revoke insert, update, delete on public.access_request_children from anon, authenticated;

delete from public.app_settings where key = 'access_temp_password';

drop policy if exists shop_orders_insert_self on public.shop_orders;
drop policy if exists shop_orders_update_parent on public.shop_orders;
drop policy if exists shop_order_items_insert_self on public.shop_order_items;
drop policy if exists shop_order_items_admin_update on public.shop_order_items;

revoke insert, update, delete on public.shop_orders from authenticated;
revoke insert, update, delete on public.shop_order_items from authenticated;
