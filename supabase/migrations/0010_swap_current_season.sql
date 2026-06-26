create or replace function public.swap_current_season(target_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.seasons
  set is_current = (id = target_id)
  where id = target_id
     or is_current = true;
$$;

grant execute on function public.swap_current_season(uuid) to authenticated;
