alter policy live_match_sheets_read on public.live_match_sheets using (
  exists(select 1 from public.profiles where auth_user_id=(select auth.uid()) and is_active)
  and (document->>'phase'='finished' or exists(select 1 from public.matches m where m.id=match_id
    and (public.is_match_staff_of(m.team_id) or public.has_permission('manage_matches'))))
);

create or replace function public.protect_live_match_score() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if current_user in ('postgres','service_role') then return new; end if;
  if (new.final_score_us is distinct from old.final_score_us or new.final_score_them is distinct from old.final_score_them or new.status is distinct from old.status)
    and exists(select 1 from public.live_match_sheets where match_id=old.id) then
    raise exception 'El resultado de este partido se guarda desde el acta en directo.' using errcode='42501';
  end if;
  return new;
end; $$;
create trigger matches_live_source before update on public.matches
for each row execute function public.protect_live_match_score();
