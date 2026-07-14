create index if not exists treasury_profile_settings_updated_by_idx
  on public.treasury_profile_settings (updated_by)
  where updated_by is not null;

drop policy if exists shop_products_manager_write on public.shop_products;
drop policy if exists shop_products_admin_insert on public.shop_products;
drop policy if exists shop_products_admin_update on public.shop_products;
drop policy if exists shop_products_admin_delete on public.shop_products;

create policy shop_products_manager_insert
  on public.shop_products for insert to authenticated
  with check (public.has_permission('manage_shop'));
create policy shop_products_manager_update
  on public.shop_products for update to authenticated
  using (public.has_permission('manage_shop'))
  with check (public.has_permission('manage_shop'));
create policy shop_products_manager_delete
  on public.shop_products for delete to authenticated
  using (public.has_permission('manage_shop'));

drop policy if exists shop_product_images_admin_insert on public.shop_product_images;
drop policy if exists shop_product_images_admin_update on public.shop_product_images;
drop policy if exists shop_product_images_admin_delete on public.shop_product_images;

create policy shop_product_images_manager_insert
  on public.shop_product_images for insert to authenticated
  with check (public.has_permission('manage_shop'));
create policy shop_product_images_manager_update
  on public.shop_product_images for update to authenticated
  using (public.has_permission('manage_shop'))
  with check (public.has_permission('manage_shop'));
create policy shop_product_images_manager_delete
  on public.shop_product_images for delete to authenticated
  using (public.has_permission('manage_shop'));

drop policy if exists treasury_concepts_select_manager on public.treasury_concepts;
drop policy if exists treasury_concepts_select_admin_directiva on public.treasury_concepts;
create policy treasury_concepts_select_authorized
  on public.treasury_concepts for select to authenticated
  using (
    public.has_permission('manage_treasury')
    or exists (
      select 1
      from public.user_roles as role
      join public.profiles as profile on profile.id = role.profile_id
      where profile.auth_user_id = (select auth.uid())
        and role.role = 'directiva'
    )
  );

drop policy if exists treasury_profile_concepts_select_manager on public.treasury_profile_concepts;
drop policy if exists treasury_profile_concepts_select_admin_directiva on public.treasury_profile_concepts;
create policy treasury_profile_concepts_select_authorized
  on public.treasury_profile_concepts for select to authenticated
  using (
    public.has_permission('manage_treasury')
    or exists (
      select 1
      from public.user_roles as role
      join public.profiles as profile on profile.id = role.profile_id
      where profile.auth_user_id = (select auth.uid())
        and role.role = 'directiva'
    )
  );

drop policy if exists treasury_closures_select_manager on public.treasury_period_closures;
drop policy if exists treasury_closures_select_admin_directiva on public.treasury_period_closures;
create policy treasury_closures_select_authorized
  on public.treasury_period_closures for select to authenticated
  using (
    public.has_permission('manage_treasury')
    or exists (
      select 1
      from public.user_roles as role
      join public.profiles as profile on profile.id = role.profile_id
      where profile.auth_user_id = (select auth.uid())
        and role.role = 'directiva'
    )
  );

drop policy if exists treasury_lines_select_manager on public.treasury_lines;
drop policy if exists treasury_lines_select_admin_directiva_family on public.treasury_lines;
create policy treasury_lines_select_authorized
  on public.treasury_lines for select to authenticated
  using (
    public.has_permission('manage_treasury')
    or exists (
      select 1
      from public.user_roles as role
      join public.profiles as profile on profile.id = role.profile_id
      where profile.auth_user_id = (select auth.uid())
        and role.role = 'directiva'
    )
    or profile_id = (
      select profile.id
      from public.profiles as profile
      where profile.auth_user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.parent_child_links as link
      where link.parent_profile_id = (
        select profile.id
        from public.profiles as profile
        where profile.auth_user_id = (select auth.uid())
      )
        and link.child_profile_id = treasury_lines.profile_id
    )
  );

drop policy if exists treasury_concepts_admin_insert on public.treasury_concepts;
drop policy if exists treasury_concepts_admin_update on public.treasury_concepts;
drop policy if exists treasury_concepts_admin_delete on public.treasury_concepts;
drop policy if exists treasury_profile_concepts_admin_insert on public.treasury_profile_concepts;
drop policy if exists treasury_profile_concepts_admin_update on public.treasury_profile_concepts;
drop policy if exists treasury_profile_concepts_admin_delete on public.treasury_profile_concepts;
drop policy if exists treasury_closures_admin_insert on public.treasury_period_closures;
drop policy if exists treasury_closures_admin_update on public.treasury_period_closures;
drop policy if exists treasury_closures_admin_delete on public.treasury_period_closures;
drop policy if exists treasury_lines_admin_insert on public.treasury_lines;
drop policy if exists treasury_lines_admin_update on public.treasury_lines;
drop policy if exists treasury_lines_admin_delete on public.treasury_lines;
