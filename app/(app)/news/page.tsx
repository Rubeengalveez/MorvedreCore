import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Megaphone, Pin } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getCurrentSeason } from "@/server/queries/seasons";
import { getTeamsForProfileInSeason } from "@/server/queries/teams";
import { getNewsFeed } from "@/server/queries/news";
import { reactToNews } from "@/server/actions/admin/news";
import { LanePattern } from "@/components/ui/lane-pattern";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import { Trofeo } from "@/components/brand/pictograms";
import { NewsCard, type NewsCardData } from "@/components/news/news-card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Noticias — Morvedre Core",
  description: "Novedades, avisos y tablón del club.",
};

interface NewsSearchParams {
  page?: string;
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<NewsSearchParams>;
}) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const { activeProfile, ownProfile } = ctx;

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const season = await getCurrentSeason();
  const teams = season
    ? await getTeamsForProfileInSeason(activeProfile.id, season.id)
    : [];
  const teamIds = teams.map((t) => t.id);

  const feed = await getNewsFeed({
    myProfileId: activeProfile.id,
    page,
    pageSize: 10,
  });

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const isAdmin = ownProfile
    ? !!(await supabase
        .from("user_roles")
        .select("role")
        .eq("profile_id", ownProfile.id)
        .eq("role", "admin")
        .is("scope_team_id", null)
        .maybeSingle()).data
    : false;
  void isAdmin;

  const teamIdsString = JSON.stringify(teamIds);
  const myReactionsByPost = new Map<string, string[]>();
  for (const p of [...feed.pinned, ...feed.recent]) {
    myReactionsByPost.set(p.id, p.my_reactions);
  }

  async function react(postId: string, reaction: "like" | "fire" | "thanks") {
    "use server";
    await reactToNews({ post_id: postId, reaction });
  }

  return (
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0" />
      <div className="relative z-[1] mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="h-7 w-7 text-pool-deep" aria-hidden="true" />
            <div>
              <h1 className="font-display text-[28px] font-extrabold leading-tight text-pool-deep">
                Noticias
              </h1>
              <p className="text-xs text-ink-600">Novedades, avisos y tablón del club.</p>
            </div>
          </div>
          {isAdmin ? (
            <Link
              href={"/admin/news" as Route}
              className="inline-flex h-10 items-center gap-1.5 rounded-md border border-ink-300 bg-paper px-3 text-sm font-bold text-pool-deep hover:bg-pool-foam"
            >
              <PictogramBadge pictogram={Trofeo} color="var(--pool-deep)" size="sm" />
              Gestionar
            </Link>
          ) : null}
        </header>

        {feed.pinned.length > 0 ? (
          <section aria-labelledby="pinned-heading" className="flex flex-col gap-2">
            <h2
              id="pinned-heading"
              className="inline-flex items-center gap-1 text-eyebrow text-ink-600"
            >
              <Pin className="h-3 w-3" aria-hidden="true" />
              Fijadas
            </h2>
            <ul className="flex flex-col gap-3">
              {feed.pinned.map((p) => (
                <li key={p.id}>
                  <NewsCard
                    post={p as NewsCardData}
                    canReact={true}
                    onReact={react}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="recent-heading" className="flex flex-col gap-2">
          <h2 id="recent-heading" className="text-eyebrow text-ink-600">
            Recientes
          </h2>
          {feed.recent.length === 0 && feed.pinned.length === 0 ? (
            <div className="rounded-md border border-dashed border-ink-300 bg-paper-card p-6 text-center">
              <Megaphone className="mx-auto h-8 w-8 text-ink-300" aria-hidden="true" />
              <p className="mt-2 text-sm text-ink-600">No hay noticias todavía.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {feed.recent.map((p) => (
                <li key={p.id}>
                  <NewsCard
                    post={p as NewsCardData}
                    canReact={true}
                    onReact={react}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {feed.total > 0 ? (
          <nav
            aria-label="Paginación"
            className="flex items-center justify-center gap-2 pt-1"
          >
            {page > 1 ? (
              <Link
                href={`/news?page=${page - 1}` as Route}
                className="inline-flex h-10 items-center rounded border border-ink-300 bg-paper px-3 text-xs font-bold text-pool-deep hover:bg-pool-foam"
              >
                ← Anterior
              </Link>
            ) : null}
            <span className="text-xs font-bold text-ink-600">Página {page}</span>
            {feed.total >= 10 ? (
              <Link
                href={`/news?page=${page + 1}` as Route}
                className="inline-flex h-10 items-center rounded border border-ink-300 bg-paper px-3 text-xs font-bold text-pool-deep hover:bg-pool-foam"
              >
                Siguiente →
              </Link>
            ) : null}
          </nav>
        ) : null}

        <p className="sr-only" data-team-ids={teamIdsString} />
      </div>
    </div>
  );
}
