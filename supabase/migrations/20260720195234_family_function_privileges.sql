revoke all on function public.profile_is_minor(uuid, date) from public, anon, authenticated;
revoke all on function public.enforce_shop_order_guardian_flow() from public, anon, authenticated;

grant execute on function public.profile_is_minor(uuid, date) to service_role;
