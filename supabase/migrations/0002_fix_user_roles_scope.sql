alter table public.user_roles drop constraint if exists user_roles_pkey;
alter table public.user_roles alter column scope_team_id drop not null;
alter table public.user_roles add constraint user_roles_unique unique (profile_id, role, scope_team_id);
