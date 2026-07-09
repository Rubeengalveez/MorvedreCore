import { createClient } from "@/lib/supabase/server";
import { isExpired, isValidReaction, tallyReactions, type ReactionTally } from "@/lib/domain/news";

export interface NewsPost {
  id: string;
  author_id: string;
  author_name: string;
  author_photo_url: string | null;
  title: string;
  body_md: string;
  image_url: string | null;
  audience: "club" | "team";
  audience_team_id: string | null;
  audience_team_label: string | null;
  pinned: boolean;
  published_at: string;
  expires_at: string | null;
}

export interface NewsPostWithReactions extends NewsPost {
  reactions: ReactionTally[];
  my_reactions: string[];
  total_reactions: number;
}

export interface NewsFeedResult {
  pinned: NewsPostWithReactions[];
  recent: NewsPostWithReactions[];
  total: number;
}

async function ensureExpiredPinned(): Promise<void> {
  const supabase = await createClient();
  try {
    await supabase.rpc("archive_expired_news");
  } catch {
    // ignore
  }
}

export async function getNewsFeed(input: {
  myProfileId: string;
  page?: number;
  pageSize?: number;
}): Promise<NewsFeedResult> {
  await ensureExpiredPinned();
  const supabase = await createClient();
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const [{ count: total }, { data: posts }, { data: teamsData }] = await Promise.all([
    supabase
      .from("news_posts")
      .select("id", { count: "exact", head: true })
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`),
    supabase
      .from("news_posts")
      .select(
        "id, author_id, title, body_md, image_url, audience, audience_team_id, pinned, published_at, expires_at",
      )
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .range(from, to),
    supabase.from("teams").select("id, label"),
  ]);

  const teamsMap = new Map<string, string>(
    ((teamsData ?? []) as Array<{ id: string; label: string }>).map((t) => [t.id, t.label]),
  );

  const list = (posts ?? []) as Array<{
    id: string;
    author_id: string;
    title: string;
    body_md: string;
    image_url: string | null;
    audience: string;
    audience_team_id: string | null;
    pinned: boolean;
    published_at: string;
    expires_at: string | null;
  }>;
  const visible = list.filter((p) => !isExpired(p.expires_at));

  if (visible.length === 0) {
    return { pinned: [], recent: [], total: total ?? 0 };
  }

  const authorIds = Array.from(new Set(visible.map((p) => p.author_id)));
  const postIds = visible.map((p) => p.id);

  const [{ data: authors }, { data: reactionsRaw }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, photo_url").in("id", authorIds),
    supabase.from("news_reactions").select("post_id, profile_id, reaction").in("post_id", postIds),
  ]);

  const authorMap = new Map(
    ((authors ?? []) as Array<{ id: string; full_name: string; photo_url: string | null }>).map(
      (a) => [a.id, a],
    ),
  );

  const reactionsByPost = new Map<string, Array<{ profile_id: string; reaction: string }>>();
  for (const r of (reactionsRaw ?? []) as Array<{
    post_id: string;
    profile_id: string;
    reaction: string;
  }>) {
    if (!isValidReaction(r.reaction)) continue;
    const arr = reactionsByPost.get(r.post_id) ?? [];
    arr.push({ profile_id: r.profile_id, reaction: r.reaction });
    reactionsByPost.set(r.post_id, arr);
  }

  const full: NewsPostWithReactions[] = visible.map((p) => {
    const author = authorMap.get(p.author_id);
    const reactions = reactionsByPost.get(p.id) ?? [];
    return {
      id: p.id,
      author_id: p.author_id,
      author_name: author?.full_name ?? "Anónimo",
      author_photo_url: author?.photo_url ?? null,
      title: p.title,
      body_md: p.body_md,
      image_url: p.image_url,
      audience: p.audience === "team" ? "team" : "club",
      audience_team_id: p.audience_team_id,
      audience_team_label: p.audience_team_id ? (teamsMap.get(p.audience_team_id) ?? null) : null,
      pinned: p.pinned,
      published_at: p.published_at,
      expires_at: p.expires_at,
      reactions: tallyReactions(reactions, input.myProfileId),
      my_reactions: reactions
        .filter((r) => r.profile_id === input.myProfileId)
        .map((r) => r.reaction),
      total_reactions: reactions.length,
    };
  });

  return {
    pinned: full.filter((p) => p.pinned),
    recent: full.filter((p) => !p.pinned),
    total: total ?? 0,
  };
}

export async function getNewsPost(
  postId: string,
  myProfileId: string,
): Promise<NewsPostWithReactions | null> {
  await ensureExpiredPinned();
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("news_posts")
    .select(
      "id, author_id, title, body_md, image_url, audience, audience_team_id, pinned, published_at, expires_at",
    )
    .eq("id", postId)
    .maybeSingle();
  if (!post) return null;
  if (isExpired((post as { expires_at: string | null }).expires_at)) return null;

  const { data: author } = await supabase
    .from("profiles")
    .select("id, full_name, photo_url")
    .eq("id", (post as { author_id: string }).author_id)
    .maybeSingle();

  const { data: teamsData } = await supabase
    .from("teams")
    .select("id, label")
    .eq("id", (post as { audience_team_id: string | null }).audience_team_id ?? "")
    .maybeSingle();

  const { data: reactionsRaw } = await supabase
    .from("news_reactions")
    .select("post_id, profile_id, reaction")
    .eq("post_id", postId);

  const reactions = (
    (reactionsRaw ?? []) as Array<{ profile_id: string; reaction: string }>
  ).filter((r) => isValidReaction(r.reaction));

  return {
    id: (post as { id: string }).id,
    author_id: (post as { author_id: string }).author_id,
    author_name: (author as { full_name?: string } | null)?.full_name ?? "Anónimo",
    author_photo_url: (author as { photo_url?: string | null } | null)?.photo_url ?? null,
    title: (post as { title: string }).title,
    body_md: (post as { body_md: string }).body_md,
    image_url: (post as { image_url: string | null }).image_url,
    audience: ((post as { audience: string }).audience as "club" | "team") ?? "club",
    audience_team_id: (post as { audience_team_id: string | null }).audience_team_id,
    audience_team_label: (teamsData as { label?: string } | null)?.label ?? null,
    pinned: (post as { pinned: boolean }).pinned,
    published_at: (post as { published_at: string }).published_at,
    expires_at: (post as { expires_at: string | null }).expires_at,
    reactions: tallyReactions(reactions, myProfileId),
    my_reactions: reactions.filter((r) => r.profile_id === myProfileId).map((r) => r.reaction),
    total_reactions: reactions.length,
  };
}

export async function getNewsForAdmin(): Promise<NewsPost[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("news_posts")
    .select(
      "id, author_id, title, body_md, image_url, audience, audience_team_id, pinned, published_at, expires_at",
    )
    .order("published_at", { ascending: false })
    .limit(200);

  const list: NewsPost[] = (
    (data ?? []) as Array<{
      id: string;
      author_id: string;
      title: string;
      body_md: string;
      image_url: string | null;
      audience: string;
      audience_team_id: string | null;
      pinned: boolean;
      published_at: string;
      expires_at: string | null;
    }>
  ).map((p) => ({
    id: p.id,
    author_id: p.author_id,
    author_name: "—",
    author_photo_url: null,
    title: p.title,
    body_md: p.body_md,
    image_url: p.image_url,
    audience: p.audience === "team" ? "team" : "club",
    audience_team_id: p.audience_team_id,
    audience_team_label: null,
    pinned: p.pinned,
    published_at: p.published_at,
    expires_at: p.expires_at,
  }));

  if (list.length === 0) return list;
  const authorIds = Array.from(new Set(list.map((p) => p.author_id)));
  const { data: authors } = await supabase
    .from("profiles")
    .select("id, full_name, photo_url")
    .in("id", authorIds);
  const map = new Map(
    ((authors ?? []) as Array<{ id: string; full_name: string; photo_url: string | null }>).map(
      (a) => [a.id, a],
    ),
  );
  for (const p of list) {
    const a = map.get(p.author_id);
    if (!a) continue;
    p.author_name = a.full_name;
    p.author_photo_url = a.photo_url ?? null;
  }
  return list;
}
