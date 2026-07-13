drop table if exists public.app_settings;

alter table public.user_roles add column if not exists id uuid not null default gen_random_uuid();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_roles'::regclass
      and contype = 'p'
  ) then
    alter table public.user_roles add constraint user_roles_pkey primary key (id);
  end if;
end
$$;

create index if not exists access_requests_approved_by_idx on public.access_requests (approved_by_profile_id);
create index if not exists access_requests_candidate_profile_idx on public.access_requests (candidate_profile_id);
create index if not exists match_stats_entered_by_idx on public.match_stats (entered_by);
create index if not exists match_stats_validated_by_idx on public.match_stats (validated_by);
create index if not exists news_posts_audience_team_id_idx on public.news_posts (audience_team_id) where audience_team_id is not null;
create index if not exists opponent_stats_team_id_idx on public.opponent_stats (team_id);
create index if not exists parent_child_links_child_idx on public.parent_child_links (child_profile_id);
create index if not exists shop_orders_approved_by_idx on public.shop_orders (approved_by) where approved_by is not null;
create index if not exists shop_orders_managed_by_idx on public.shop_orders (managed_by) where managed_by is not null;
create index if not exists shop_products_created_by_idx on public.shop_products (created_by);
create index if not exists team_staff_granted_by_idx on public.team_staff (granted_by) where granted_by is not null;
create index if not exists training_attendance_marked_by_idx on public.training_attendance (marked_by) where marked_by is not null;
create index if not exists training_blocks_created_by_idx on public.training_blocks (created_by) where created_by is not null;
create index if not exists training_sessions_cancelled_by_idx on public.training_sessions (cancelled_by) where cancelled_by is not null;
create index if not exists treasury_lines_concept_id_idx on public.treasury_lines (concept_id);
create index if not exists treasury_period_closures_generated_by_idx on public.treasury_period_closures (generated_by) where generated_by is not null;
create index if not exists treasury_profile_concepts_concept_id_idx on public.treasury_profile_concepts (concept_id);
create index if not exists user_roles_granted_by_idx on public.user_roles (granted_by) where granted_by is not null;

drop policy if exists profiles_select_all on public.profiles;
drop policy if exists profiles_admin_insert on public.profiles;
drop policy if exists profiles_insert_admin on public.profiles;
drop policy if exists profiles_insert_self on public.profiles;
drop policy if exists profiles_insert_service_role on public.profiles;
drop policy if exists profiles_update_self on public.profiles;
drop policy if exists profiles_update_admin on public.profiles;
drop policy if exists profiles_delete_admin on public.profiles;

drop policy if exists "Admins can manage access requests" on public.access_requests;
drop policy if exists "Admins can manage access request children" on public.access_request_children;

drop policy if exists match_callups_update_admin_coach on public.match_callups;
drop policy if exists match_callups_update_player_rsvp on public.match_callups;
create policy match_callups_update_authorized
  on public.match_callups
  for update
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_coach_of(m.team_id)
    )
    or player_id = (
      select p.id
      from public.profiles p
      where p.auth_user_id = (select auth.uid())
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_coach_of(m.team_id)
    )
    or player_id = (
      select p.id
      from public.profiles p
      where p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists match_stats_update_admin_coach on public.match_stats;
drop policy if exists match_stats_update_delegate on public.match_stats;
create policy match_stats_update_authorized
  on public.match_stats
  for update
  to authenticated
  using (
    public.is_admin()
    or (
      validated_at is null
      and exists (
        select 1
        from public.matches m
        where m.id = match_id
          and public.is_coach_of(m.team_id)
      )
    )
    or (
      validated_at is null
      and validated_by is null
      and exists (
        select 1
        from public.matches m
        where m.id = match_id
          and public.is_delegate_of(m.team_id)
      )
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.matches m
      where m.id = match_id
        and public.is_coach_of(m.team_id)
    )
    or (
      validated_at is null
      and validated_by is null
      and exists (
        select 1
        from public.matches m
        where m.id = match_id
          and public.is_delegate_of(m.team_id)
      )
    )
  );

drop policy if exists news_posts_select_authenticated on public.news_posts;
create policy news_posts_select_authenticated
  on public.news_posts
  for select
  to authenticated
  using (
    case
      when audience = 'club' then true
      when audience = 'team' then
        public.is_coach_of(audience_team_id)
        or public.is_admin()
        or exists (
          select 1
          from public.team_rosters tr
          where tr.team_id = audience_team_id
            and tr.player_id = (
              select p.id
              from public.profiles p
              where p.auth_user_id = (select auth.uid())
            )
            and tr.left_at is null
        )
      else false
    end
  );

drop policy if exists news_reactions_insert_own on public.news_reactions;
create policy news_reactions_insert_own
  on public.news_reactions
  for insert
  to authenticated
  with check (
    profile_id = (
      select p.id
      from public.profiles p
      where p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists news_reactions_delete_own on public.news_reactions;
create policy news_reactions_delete_own
  on public.news_reactions
  for delete
  to authenticated
  using (
    profile_id = (
      select p.id
      from public.profiles p
      where p.auth_user_id = (select auth.uid())
    )
  );

drop policy if exists shop_orders_select on public.shop_orders;
create policy shop_orders_select
  on public.shop_orders
  for select
  to authenticated
  using (
    requested_by = (
      select p.id from public.profiles p where p.auth_user_id = (select auth.uid())
    )
    or approved_by = (
      select p.id from public.profiles p where p.auth_user_id = (select auth.uid())
    )
    or public.is_admin()
    or exists (
      select 1
      from public.parent_child_links pcl
      where pcl.parent_profile_id = (
        select p.id from public.profiles p where p.auth_user_id = (select auth.uid())
      )
        and pcl.child_profile_id = shop_orders.requested_by
    )
  );

drop policy if exists treasury_concepts_select_admin_directiva on public.treasury_concepts;
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
      where p.auth_user_id = (select auth.uid())
        and ur.role = 'directiva'
    )
  );

drop policy if exists treasury_profile_concepts_select_admin_directiva on public.treasury_profile_concepts;
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
      where p.auth_user_id = (select auth.uid())
        and ur.role = 'directiva'
    )
  );

drop policy if exists treasury_closures_select_admin_directiva on public.treasury_period_closures;
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
      where p.auth_user_id = (select auth.uid())
        and ur.role = 'directiva'
    )
  );

drop policy if exists treasury_lines_select_admin_directiva_family on public.treasury_lines;
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
      where p.auth_user_id = (select auth.uid())
        and ur.role = 'directiva'
    )
    or profile_id = (
      select p.id from public.profiles p where p.auth_user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.parent_child_links pcl
      where pcl.parent_profile_id = (
        select p.id from public.profiles p where p.auth_user_id = (select auth.uid())
      )
        and pcl.child_profile_id = treasury_lines.profile_id
    )
  );

drop policy if exists news_posts_admin_write on public.news_posts;
create policy news_posts_admin_insert on public.news_posts for insert to authenticated with check (public.is_admin());
create policy news_posts_admin_update on public.news_posts for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy news_posts_admin_delete on public.news_posts for delete to authenticated using (public.is_admin());

drop policy if exists opponent_stats_admin_all on public.opponent_stats;
create policy opponent_stats_admin_insert on public.opponent_stats for insert to authenticated with check (public.is_admin());
create policy opponent_stats_admin_update on public.opponent_stats for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy opponent_stats_admin_delete on public.opponent_stats for delete to authenticated using (public.is_admin());

drop policy if exists ranking_snapshots_admin_all on public.ranking_snapshots;
create policy ranking_snapshots_admin_insert on public.ranking_snapshots for insert to authenticated with check (public.is_admin());
create policy ranking_snapshots_admin_update on public.ranking_snapshots for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy ranking_snapshots_admin_delete on public.ranking_snapshots for delete to authenticated using (public.is_admin());

drop policy if exists shop_product_images_admin_write on public.shop_product_images;
create policy shop_product_images_admin_insert on public.shop_product_images for insert to authenticated with check (public.is_admin());
create policy shop_product_images_admin_update on public.shop_product_images for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy shop_product_images_admin_delete on public.shop_product_images for delete to authenticated using (public.is_admin());

drop policy if exists shop_products_admin_write on public.shop_products;
create policy shop_products_admin_insert on public.shop_products for insert to authenticated with check (public.is_admin());
create policy shop_products_admin_update on public.shop_products for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy shop_products_admin_delete on public.shop_products for delete to authenticated using (public.is_admin());

drop policy if exists streaks_admin_all on public.streaks;
create policy streaks_admin_insert on public.streaks for insert to authenticated with check (public.is_admin());
create policy streaks_admin_update on public.streaks for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy streaks_admin_delete on public.streaks for delete to authenticated using (public.is_admin());

drop policy if exists treasury_concepts_admin_write on public.treasury_concepts;
create policy treasury_concepts_admin_insert on public.treasury_concepts for insert to authenticated with check (public.is_admin());
create policy treasury_concepts_admin_update on public.treasury_concepts for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy treasury_concepts_admin_delete on public.treasury_concepts for delete to authenticated using (public.is_admin());

drop policy if exists treasury_profile_concepts_admin_write on public.treasury_profile_concepts;
create policy treasury_profile_concepts_admin_insert on public.treasury_profile_concepts for insert to authenticated with check (public.is_admin());
create policy treasury_profile_concepts_admin_update on public.treasury_profile_concepts for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy treasury_profile_concepts_admin_delete on public.treasury_profile_concepts for delete to authenticated using (public.is_admin());

drop policy if exists treasury_closures_admin_write on public.treasury_period_closures;
create policy treasury_closures_admin_insert on public.treasury_period_closures for insert to authenticated with check (public.is_admin());
create policy treasury_closures_admin_update on public.treasury_period_closures for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy treasury_closures_admin_delete on public.treasury_period_closures for delete to authenticated using (public.is_admin());

drop policy if exists treasury_lines_admin_write on public.treasury_lines;
create policy treasury_lines_admin_insert on public.treasury_lines for insert to authenticated with check (public.is_admin());
create policy treasury_lines_admin_update on public.treasury_lines for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy treasury_lines_admin_delete on public.treasury_lines for delete to authenticated using (public.is_admin());
