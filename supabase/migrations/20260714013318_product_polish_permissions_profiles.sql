alter table public.profile_permissions
  drop constraint if exists profile_permissions_permission_check;

alter table public.profile_permissions
  add constraint profile_permissions_permission_check
  check (
    permission in (
      'manage_attendance',
      'manage_shop',
      'manage_teams',
      'manage_players',
      'manage_families',
      'manage_treasury',
      'manage_news',
      'manage_matches',
      'manage_trainings',
      'manage_staff'
    )
  );

create or replace function public.has_permission(required_permission text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1
    from public.profile_permissions as permission
    join public.profiles as profile on profile.id = permission.profile_id
    where profile.auth_user_id = (select auth.uid())
      and permission.permission = required_permission
  );
$$;

revoke all on function public.has_permission(text) from public, anon;
grant execute on function public.has_permission(text) to authenticated;

drop policy if exists profile_permissions_select_authenticated on public.profile_permissions;
create policy profile_permissions_select_self_or_admin
  on public.profile_permissions
  for select
  to authenticated
  using (
    profile_id = (
      select profile.id
      from public.profiles as profile
      where profile.auth_user_id = (select auth.uid())
    )
    or public.is_admin()
  );

alter table public.profiles
  add column if not exists is_active boolean not null default true;

create index if not exists profiles_active_name_idx
  on public.profiles (full_name)
  where is_active;

alter table public.shop_orders
  add column if not exists contact_phone_e164 text;

alter table public.shop_orders
  add constraint shop_orders_contact_phone_format
  check (
    contact_phone_e164 is null
    or contact_phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_select_authenticated on storage.objects;
create policy avatars_select_authenticated
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'avatars');

drop policy if exists avatars_insert_owner_or_manager on storage.objects;
create policy avatars_insert_owner_or_manager
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = (
        select profile.id::text
        from public.profiles as profile
        where profile.auth_user_id = (select auth.uid())
      )
      or public.has_permission('manage_players')
    )
  );

drop policy if exists avatars_update_owner_or_manager on storage.objects;
create policy avatars_update_owner_or_manager
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = (
        select profile.id::text
        from public.profiles as profile
        where profile.auth_user_id = (select auth.uid())
      )
      or public.has_permission('manage_players')
    )
  )
  with check (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = (
        select profile.id::text
        from public.profiles as profile
        where profile.auth_user_id = (select auth.uid())
      )
      or public.has_permission('manage_players')
    )
  );

drop policy if exists avatars_delete_owner_or_manager on storage.objects;
create policy avatars_delete_owner_or_manager
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = (
        select profile.id::text
        from public.profiles as profile
        where profile.auth_user_id = (select auth.uid())
      )
      or public.has_permission('manage_players')
    )
  );

create table public.treasury_profile_settings (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  monthly_fee_cents integer check (monthly_fee_cents is null or monthly_fee_cents >= 0),
  fee_exempt boolean not null default false,
  billing_profile_id uuid references public.profiles(id) on delete set null,
  notes text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (billing_profile_id is null or billing_profile_id <> profile_id)
);

create index treasury_profile_settings_billing_profile_idx
  on public.treasury_profile_settings (billing_profile_id)
  where billing_profile_id is not null;

alter table public.treasury_profile_settings enable row level security;

create policy treasury_profile_settings_select_manager
  on public.treasury_profile_settings
  for select
  to authenticated
  using (public.has_permission('manage_treasury'));

create policy treasury_profile_settings_insert_manager
  on public.treasury_profile_settings
  for insert
  to authenticated
  with check (public.has_permission('manage_treasury'));

create policy treasury_profile_settings_update_manager
  on public.treasury_profile_settings
  for update
  to authenticated
  using (public.has_permission('manage_treasury'))
  with check (public.has_permission('manage_treasury'));

create policy treasury_profile_settings_delete_manager
  on public.treasury_profile_settings
  for delete
  to authenticated
  using (public.has_permission('manage_treasury'));

grant select, insert, update, delete on public.treasury_profile_settings to authenticated;

drop policy if exists shop_products_admin_write on public.shop_products;
create policy shop_products_manager_write
  on public.shop_products
  for all
  to authenticated
  using (public.has_permission('manage_shop'))
  with check (public.has_permission('manage_shop'));

drop policy if exists shop_orders_select on public.shop_orders;
create policy shop_orders_select
  on public.shop_orders
  for select
  to authenticated
  using (
    requested_by = (
      select profile.id
      from public.profiles as profile
      where profile.auth_user_id = (select auth.uid())
    )
    or approved_by = (
      select profile.id
      from public.profiles as profile
      where profile.auth_user_id = (select auth.uid())
    )
    or public.has_permission('manage_shop')
    or exists (
      select 1
      from public.parent_child_links as link
      where link.parent_profile_id = (
        select profile.id
        from public.profiles as profile
        where profile.auth_user_id = (select auth.uid())
      )
        and link.child_profile_id = shop_orders.requested_by
    )
  );

drop policy if exists shop_order_items_admin_update on public.shop_order_items;
create policy shop_order_items_manager_update
  on public.shop_order_items
  for update
  to authenticated
  using (public.has_permission('manage_shop'))
  with check (public.has_permission('manage_shop'));

create policy shop_orders_manager_update
  on public.shop_orders
  for update
  to authenticated
  using (public.has_permission('manage_shop'))
  with check (public.has_permission('manage_shop'));

drop policy if exists shop_images_insert_admin on storage.objects;
create policy shop_images_insert_manager
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'shop-images'
    and (storage.foldername(name))[1] = 'shop'
    and public.has_permission('manage_shop')
  );

drop policy if exists shop_images_update_admin on storage.objects;
create policy shop_images_update_manager
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'shop-images' and public.has_permission('manage_shop'))
  with check (bucket_id = 'shop-images' and public.has_permission('manage_shop'));

drop policy if exists shop_images_delete_admin on storage.objects;
create policy shop_images_delete_manager
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'shop-images' and public.has_permission('manage_shop'));

create policy treasury_concepts_select_manager
  on public.treasury_concepts
  for select
  to authenticated
  using (public.has_permission('manage_treasury'));

create policy treasury_concepts_insert_manager on public.treasury_concepts
  for insert to authenticated with check (public.has_permission('manage_treasury'));
create policy treasury_concepts_update_manager on public.treasury_concepts
  for update to authenticated using (public.has_permission('manage_treasury'))
  with check (public.has_permission('manage_treasury'));
create policy treasury_concepts_delete_manager on public.treasury_concepts
  for delete to authenticated using (public.has_permission('manage_treasury'));

create policy treasury_profile_concepts_select_manager
  on public.treasury_profile_concepts
  for select to authenticated using (public.has_permission('manage_treasury'));
create policy treasury_profile_concepts_insert_manager on public.treasury_profile_concepts
  for insert to authenticated with check (public.has_permission('manage_treasury'));
create policy treasury_profile_concepts_update_manager on public.treasury_profile_concepts
  for update to authenticated using (public.has_permission('manage_treasury'))
  with check (public.has_permission('manage_treasury'));
create policy treasury_profile_concepts_delete_manager on public.treasury_profile_concepts
  for delete to authenticated using (public.has_permission('manage_treasury'));

create policy treasury_closures_select_manager
  on public.treasury_period_closures
  for select to authenticated using (public.has_permission('manage_treasury'));
create policy treasury_closures_insert_manager on public.treasury_period_closures
  for insert to authenticated with check (public.has_permission('manage_treasury'));
create policy treasury_closures_update_manager on public.treasury_period_closures
  for update to authenticated using (public.has_permission('manage_treasury'))
  with check (public.has_permission('manage_treasury'));
create policy treasury_closures_delete_manager on public.treasury_period_closures
  for delete to authenticated using (public.has_permission('manage_treasury'));

create policy treasury_lines_select_manager
  on public.treasury_lines
  for select to authenticated using (public.has_permission('manage_treasury'));
create policy treasury_lines_insert_manager on public.treasury_lines
  for insert to authenticated with check (public.has_permission('manage_treasury'));
create policy treasury_lines_update_manager on public.treasury_lines
  for update to authenticated using (public.has_permission('manage_treasury'))
  with check (public.has_permission('manage_treasury'));
create policy treasury_lines_delete_manager on public.treasury_lines
  for delete to authenticated using (public.has_permission('manage_treasury'));
