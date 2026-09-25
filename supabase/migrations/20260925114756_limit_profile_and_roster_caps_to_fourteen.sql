update public.profiles
set cap_number = null
where cap_number is not null and cap_number not between 1 and 14;

update public.team_rosters
set squad_number = null
where squad_number is not null and squad_number not between 1 and 14;

alter table public.profiles
  add constraint profiles_cap_number_valid_check
  check (cap_number is null or cap_number between 1 and 14);

alter table public.team_rosters
  drop constraint if exists team_rosters_squad_number_check;

alter table public.team_rosters
  add constraint team_rosters_squad_number_valid_check
  check (squad_number is null or squad_number between 1 and 14);
