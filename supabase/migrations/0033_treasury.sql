-- 0032_treasury.sql
-- Fase 6: Tesoreria

create type public.treasury_concept_kind as enum (
  'fee',
  'material',
  'tournament',
  'adjustment',
  'discount'
);

create type public.treasury_periodicity as enum (
  'monthly',
  'seasonal',
  'one_off'
);

create type public.treasury_applies_to as enum (
  'all_players',
  'all_members',
  'specific_role',
  'specific_profile'
);

create type public.treasury_closure_status as enum (
  'draft',
  'sent',
  'archived'
);

create type public.treasury_payment_method as enum (
  'bank_transfer',
  'bizum',
  'cash',
  'other'
);

create table public.treasury_concepts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  kind public.treasury_concept_kind not null default 'fee',
  periodicity public.treasury_periodicity not null default 'monthly',
  default_amount_cents integer,
  applies_to public.treasury_applies_to not null default 'specific_profile',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.treasury_profile_concepts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  concept_id uuid not null references public.treasury_concepts(id) on delete cascade,
  amount_cents integer,
  starts_on date,
  ends_on date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (profile_id, concept_id)
);

create table public.treasury_period_closures (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  period_label text not null,
  period_start date not null,
  period_end date not null,
  generated_at timestamptz not null default now(),
  generated_by uuid not null references public.profiles(id),
  sent_to_email text,
  sent_at timestamptz,
  status public.treasury_closure_status not null default 'draft',
  total_cents integer not null default 0,
  notes text,
  unique (season_id, period_start, period_end)
);

create table public.treasury_lines (
  id uuid primary key default gen_random_uuid(),
  closure_id uuid not null references public.treasury_period_closures(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  concept_id uuid references public.treasury_concepts(id),
  source_type text not null default 'concept',
  source_id uuid,
  description text not null,
  amount_cents integer not null,
  paid boolean not null default false,
  paid_at date,
  payment_method public.treasury_payment_method,
  created_at timestamptz not null default now()
);

create index treasury_concepts_active_idx on public.treasury_concepts (active);
create index treasury_profile_concepts_profile_idx on public.treasury_profile_concepts (profile_id, active);
create index treasury_period_closures_period_idx on public.treasury_period_closures (period_start desc);
create index treasury_lines_closure_idx on public.treasury_lines (closure_id);
create index treasury_lines_profile_idx on public.treasury_lines (profile_id, paid);

create trigger treasury_concepts_set_updated_at
  before update on public.treasury_concepts
  for each row execute function public.set_updated_at();

alter table public.treasury_concepts enable row level security;
alter table public.treasury_profile_concepts enable row level security;
alter table public.treasury_period_closures enable row level security;
alter table public.treasury_lines enable row level security;

create policy treasury_concepts_select_admin_directiva
  on public.treasury_concepts
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.user_roles ur
      join public.profiles p on p.id = ur.profile_id
      where p.auth_user_id = auth.uid()
        and ur.role = 'directiva'
    )
  );

create policy treasury_concepts_admin_write
  on public.treasury_concepts
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy treasury_profile_concepts_select_admin_directiva
  on public.treasury_profile_concepts
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.user_roles ur
      join public.profiles p on p.id = ur.profile_id
      where p.auth_user_id = auth.uid()
        and ur.role = 'directiva'
    )
  );

create policy treasury_profile_concepts_admin_write
  on public.treasury_profile_concepts
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy treasury_closures_select_admin_directiva
  on public.treasury_period_closures
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.user_roles ur
      join public.profiles p on p.id = ur.profile_id
      where p.auth_user_id = auth.uid()
        and ur.role = 'directiva'
    )
  );

create policy treasury_closures_admin_write
  on public.treasury_period_closures
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy treasury_lines_select_admin_directiva_family
  on public.treasury_lines
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.user_roles ur
      join public.profiles p on p.id = ur.profile_id
      where p.auth_user_id = auth.uid()
        and ur.role = 'directiva'
    )
    or profile_id = (select id from public.profiles where auth_user_id = auth.uid())
    or exists (
      select 1
      from public.parent_child_links pcl
      where pcl.parent_profile_id = (select id from public.profiles where auth_user_id = auth.uid())
        and pcl.child_profile_id = treasury_lines.profile_id
    )
  );

create policy treasury_lines_admin_write
  on public.treasury_lines
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
