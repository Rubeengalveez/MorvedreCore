drop function if exists public.can_see_profile_pii(uuid);

alter function public.refresh_opponent_stats() security definer;
alter function public.recalculate_opponent_stats(uuid, uuid, text) security definer;
alter function public.sync_travel_seats_taken() security definer;

revoke execute on function public.archive_expired_news() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_coach_of(uuid) from public, anon;
revoke execute on function public.is_delegate_of(uuid) from public, anon;
revoke execute on function public.reserve_travel_seat(uuid, uuid) from public, anon;
revoke execute on function public.swap_current_season(uuid) from public, anon;

revoke execute on function public.match_callups_protect_rsvp_columns() from public, anon, authenticated;
revoke execute on function public.recalculate_opponent_stats(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.refresh_opponent_stats() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.sync_travel_seats_taken() from public, anon, authenticated;
revoke execute on function public.training_sessions_sync_end_at() from public, anon, authenticated;
revoke execute on function public.validate_travel_reservation() from public, anon, authenticated;

grant execute on function public.archive_expired_news() to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.is_coach_of(uuid) to authenticated, service_role;
grant execute on function public.is_delegate_of(uuid) to authenticated, service_role;
grant execute on function public.reserve_travel_seat(uuid, uuid) to authenticated, service_role;
grant execute on function public.swap_current_season(uuid) to authenticated, service_role;
