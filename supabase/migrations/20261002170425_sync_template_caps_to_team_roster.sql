create or replace function private.sync_template_caps_to_team_roster()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    update public.team_rosters set squad_number = null
    where team_id = old.team_id and player_id = old.player_id and left_at is null;
    return old;
  end if;
  if tg_op = 'UPDATE' and (old.team_id <> new.team_id or old.player_id <> new.player_id) then
    update public.team_rosters set squad_number = null
    where team_id = old.team_id and player_id = old.player_id and left_at is null;
  end if;
  update public.team_rosters set squad_number = new.cap_number
  where team_id = new.team_id and player_id = new.player_id and left_at is null
    and squad_number is distinct from new.cap_number;
  return new;
end;
$$;
revoke all on function private.sync_template_caps_to_team_roster() from public,anon,authenticated;
create trigger team_callup_templates_sync_roster_caps
after insert or update or delete on public.team_callup_templates
for each row execute function private.sync_template_caps_to_team_roster();
