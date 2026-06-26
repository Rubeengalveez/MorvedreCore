create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  full_name text not null,
  photo_url text,
  birth_year smallint check (birth_year is null or (birth_year between 1900 and 2100)),
  gender text check (gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  cap_number smallint,
  license_active boolean not null default false,
  phone_e164 text,
  email_contact text,
  notes text,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_auth_user_id_idx on public.profiles (auth_user_id);
create index profiles_full_name_idx on public.profiles (full_name);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_roles (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'coach', 'delegate', 'directiva', 'parent', 'player')),
  scope_team_id uuid,
  granted_by uuid references public.profiles(id),
  granted_at timestamptz not null default now(),
  unique (profile_id, role, scope_team_id)
);

create index user_roles_profile_id_idx on public.user_roles (profile_id);
create index user_roles_scope_team_id_idx on public.user_roles (scope_team_id);

create table public.parent_child_links (
  parent_profile_id uuid not null references public.profiles(id) on delete cascade,
  child_profile_id uuid not null references public.profiles(id) on delete cascade,
  relation text not null check (relation in ('mother', 'father', 'legal_guardian', 'other')),
  created_at timestamptz not null default now(),
  primary key (parent_profile_id, child_profile_id),
  check (parent_profile_id <> child_profile_id)
);

create index parent_child_links_child_profile_id_idx on public.parent_child_links (child_profile_id);

create table public.profile_notification_prefs (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null check (notification_type in (
    'convocatoria',
    'entrenamiento_cancelado',
    'pedido_pendiente',
    'noticia_fijada',
    'resultado_publicado',
    'cierre_mensual'
  )),
  enabled boolean not null default true,
  primary key (profile_id, notification_type)
);

create or replace function public.is_admin()
returns boolean
language sql
security invoker
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.profile_id
    where p.auth_user_id = (select auth.uid())
      and ur.role = 'admin'
      and ur.scope_team_id is null
  );
$$;

create or replace function public.is_coach_of(team_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.profile_id
    where p.auth_user_id = (select auth.uid())
      and ur.role = 'coach'
      and ur.scope_team_id = team_id
  );
$$;

revoke execute on function public.is_admin() from public;
revoke execute on function public.is_coach_of(uuid) from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_coach_of(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.parent_child_links enable row level security;
alter table public.profile_notification_prefs enable row level security;

create policy profiles_select_authenticated
  on public.profiles
  for select
  to authenticated
  using (true);

create policy profiles_insert_service_role
  on public.profiles
  for insert
  to service_role
  with check (true);

create policy profiles_update_self
  on public.profiles
  for update
  to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

create policy profiles_update_admin
  on public.profiles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy profiles_delete_admin
  on public.profiles
  for delete
  to authenticated
  using (public.is_admin());

create policy user_roles_select_authenticated
  on public.user_roles
  for select
  to authenticated
  using (true);

create policy user_roles_insert_admin
  on public.user_roles
  for insert
  to authenticated
  with check (public.is_admin());

create policy user_roles_update_admin
  on public.user_roles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy user_roles_delete_admin
  on public.user_roles
  for delete
  to authenticated
  using (public.is_admin());

create policy parent_child_links_select_self_or_admin
  on public.parent_child_links
  for select
  to authenticated
  using (
    public.is_admin()
    or parent_profile_id in (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
    or child_profile_id in (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
  );

create policy parent_child_links_insert_admin
  on public.parent_child_links
  for insert
  to authenticated
  with check (public.is_admin());

create policy parent_child_links_delete_admin
  on public.parent_child_links
  for delete
  to authenticated
  using (public.is_admin());

create policy profile_notification_prefs_select_self
  on public.profile_notification_prefs
  for select
  to authenticated
  using (
    profile_id in (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
  );

create policy profile_notification_prefs_insert_self
  on public.profile_notification_prefs
  for insert
  to authenticated
  with check (
    profile_id in (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
  );

create policy profile_notification_prefs_update_self
  on public.profile_notification_prefs
  for update
  to authenticated
  using (
    profile_id in (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
  )
  with check (
    profile_id in (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
  );

create policy profile_notification_prefs_delete_self
  on public.profile_notification_prefs
  for delete
  to authenticated
  using (
    profile_id in (
      select id from public.profiles where auth_user_id = (select auth.uid())
    )
  );
