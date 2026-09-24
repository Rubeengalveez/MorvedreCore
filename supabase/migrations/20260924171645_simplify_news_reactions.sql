delete from public.news_reactions where reaction not in ('like', 'dislike');

alter table public.news_reactions
  drop constraint if exists news_reactions_reaction_check;

alter table public.news_reactions
  add constraint news_reactions_reaction_check
  check (reaction in ('like', 'dislike'));

alter table public.news_reactions
  drop constraint if exists news_reactions_post_id_profile_id_reaction_key;

alter table public.news_reactions
  add constraint news_reactions_one_per_profile unique (post_id, profile_id);

create policy news_reactions_update_own
  on public.news_reactions
  for update
  to authenticated
  using (
    profile_id = (
      select p.id
      from public.profiles p
      where p.auth_user_id = (select auth.uid())
    )
  )
  with check (
    profile_id = (
      select p.id
      from public.profiles p
      where p.auth_user_id = (select auth.uid())
    )
  );
