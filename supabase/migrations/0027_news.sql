-- 0026_news.sql
-- Fase 4 — Noticias y tablón
-- Tablas: news_posts, news_reactions
-- Reglas: markdown seguro, fijado opcional, caducidad opcional, reacciones (3 tipos)

-- Tabla de noticias
create table public.news_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body_md text not null,
  image_url text,
  audience text not null default 'club' check (audience in ('club', 'team')),
  audience_team_id uuid references public.teams(id) on delete cascade,
  pinned boolean not null default false,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_audience_consistency
    check ((audience = 'club' and audience_team_id is null)
        or (audience = 'team' and audience_team_id is not null))
);

create index news_posts_published_at_idx on public.news_posts (published_at desc);
create index news_posts_pinned_idx on public.news_posts (pinned desc, published_at desc);
create index news_posts_author_id_idx on public.news_posts (author_id);
create index news_posts_audience_idx on public.news_posts (audience, audience_team_id);

create trigger news_posts_set_updated_at
  before update on public.news_posts
  for each row execute function public.set_updated_at();

-- Tabla de reacciones
create table public.news_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.news_posts(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('like', 'fire', 'thanks')),
  created_at timestamptz not null default now(),
  unique (post_id, profile_id, reaction)
);

create index news_reactions_post_id_idx on public.news_reactions (post_id);
create index news_reactions_profile_id_idx on public.news_reactions (profile_id);

-- RLS
alter table public.news_posts enable row level security;
alter table public.news_reactions enable row level security;

-- Posts: lectura para todos los autenticados
drop policy if exists news_posts_select_authenticated on public.news_posts;
create policy news_posts_select_authenticated
  on public.news_posts
  for select
  to authenticated
  using (
    case
      when audience = 'club' then true
      when audience = 'team' then public.is_coach_of(audience_team_id) or public.is_admin()
        or exists (
          select 1 from public.team_rosters tr
          where tr.team_id = audience_team_id and tr.player_id = auth.uid() and tr.left_at is null
        )
      else false
    end
  );

-- Posts: solo admin puede escribir
drop policy if exists news_posts_admin_write on public.news_posts;
create policy news_posts_admin_write
  on public.news_posts
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Reacciones: cualquier autenticado puede leer y escribir las suyas
drop policy if exists news_reactions_select_authenticated on public.news_reactions;
create policy news_reactions_select_authenticated
  on public.news_reactions
  for select
  to authenticated
  using (true);

drop policy if exists news_reactions_insert_own on public.news_reactions;
create policy news_reactions_insert_own
  on public.news_reactions
  for insert
  to authenticated
  with check (profile_id = (select id from public.profiles where auth_user_id = auth.uid()));

drop policy if exists news_reactions_delete_own on public.news_reactions;
create policy news_reactions_delete_own
  on public.news_reactions
  for delete
  to authenticated
  using (profile_id = (select id from public.profiles where auth_user_id = auth.uid()));

-- Función para archivar posts caducados (se llama desde getNewsFeed o manualmente)
create or replace function public.archive_expired_news()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.news_posts
    set pinned = false
    where expires_at is not null
      and expires_at < now()
      and pinned = true;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
