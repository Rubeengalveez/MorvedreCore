create or replace function public.validate_parent_child_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_birth_year integer;
  child_birth_year integer;
  parent_active boolean;
  child_active boolean;
begin
  select profile.birth_year, profile.is_active
  into parent_birth_year, parent_active
  from public.profiles as profile
  where profile.id = new.parent_profile_id;

  select profile.birth_year, profile.is_active
  into child_birth_year, child_active
  from public.profiles as profile
  where profile.id = new.child_profile_id;

  if not coalesce(parent_active, false) or not coalesce(child_active, false) then
    raise exception 'Family links require active profiles.';
  end if;

  if parent_birth_year is null
    or parent_birth_year > extract(year from current_date)::integer - 18 then
    raise exception 'A guardian must be an adult with a known birth year.';
  end if;

  if child_birth_year is not null
    and child_birth_year <= extract(year from current_date)::integer - 18 then
    raise exception 'Family-managed profiles must be minors.';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_parent_child_link() from public, anon, authenticated;

drop trigger if exists parent_child_links_validate_profiles on public.parent_child_links;
create trigger parent_child_links_validate_profiles
  before insert or update of parent_profile_id, child_profile_id on public.parent_child_links
  for each row execute function public.validate_parent_child_link();
