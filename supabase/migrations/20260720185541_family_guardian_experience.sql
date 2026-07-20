alter table public.shop_orders
  add column if not exists guardian_approval_required boolean not null default false;

create or replace function public.profile_is_minor(target_profile_id uuid, on_date date default current_date)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(
    (
      select profile.birth_year > extract(year from on_date)::integer - 18
      from public.profiles as profile
      where profile.id = target_profile_id
    ),
    true
  );
$$;

revoke execute on function public.profile_is_minor(uuid, date) from public;
grant execute on function public.profile_is_minor(uuid, date) to authenticated, service_role;

update public.shop_orders as shop_order
set guardian_approval_required = public.profile_is_minor(shop_order.requested_by, shop_order.requested_at::date);

create or replace function public.enforce_shop_order_guardian_flow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requires_guardian boolean;
begin
  if tg_op = 'UPDATE' then
    new.guardian_approval_required := old.guardian_approval_required;
    return new;
  end if;

  requires_guardian := public.profile_is_minor(new.requested_by, coalesce(new.requested_at::date, current_date));
  new.guardian_approval_required := requires_guardian;

  if requires_guardian then
    if not exists (
      select 1
      from public.parent_child_links as link
      where link.child_profile_id = new.requested_by
    ) then
      raise exception 'A minor needs a linked guardian before creating a shop order.';
    end if;

    if new.status = 'pending_admin' then
      new.status := 'pending_parent';
      new.approved_by := null;
      new.approved_at := null;
    end if;
  elsif new.status = 'pending_parent' then
    new.status := 'pending_admin';
  end if;

  return new;
end;
$$;

drop trigger if exists shop_orders_guardian_flow on public.shop_orders;
create trigger shop_orders_guardian_flow
  before insert or update of guardian_approval_required on public.shop_orders
  for each row execute function public.enforce_shop_order_guardian_flow();

drop policy if exists treasury_lines_select_authorized on public.treasury_lines;
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
    or exists (
      select 1
      from public.profiles as profile
      where profile.id = treasury_lines.profile_id
        and profile.auth_user_id = (select auth.uid())
        and profile.birth_year is not null
        and profile.birth_year <= extract(year from current_date)::integer - 18
    )
    or exists (
      select 1
      from public.parent_child_links as link
      join public.profiles as parent on parent.id = link.parent_profile_id
      where parent.auth_user_id = (select auth.uid())
        and parent.birth_year is not null
        and parent.birth_year <= extract(year from current_date)::integer - 18
        and link.child_profile_id = treasury_lines.profile_id
    )
  );

create index if not exists shop_orders_guardian_pending_idx
  on public.shop_orders (requested_by, requested_at desc)
  where guardian_approval_required and status = 'pending_parent';
