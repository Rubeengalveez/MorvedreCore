import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, ArrowRight, Megaphone, Settings2 } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getNewsFeed } from "@/server/queries/news";
import { reactToNews } from "@/server/actions/admin/news";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { NewsCard, type NewsCardData } from "@/components/news/news-card";
import type { NewsReaction } from "@/lib/domain/news";

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
  const feed = await getNewsFeed({ myProfileId: activeProfile.id, page, pageSize: 10 });

  const supabase = await createClient();
  const isAdmin = ownProfile
    ? !!(
        await supabase
          .from("user_roles")
          .select("role")
          .eq("profile_id", ownProfile.id)
          .eq("role", "admin")
          .is("scope_team_id", null)
          .maybeSingle()
      ).data
    : false;

  async function react(postId: string, reaction: NewsReaction) {
    "use server";
    await reactToNews({ post_id: postId, reaction });
  }

  const [lead, ...otherPinned] = feed.pinned;
  const hasNews = feed.pinned.length > 0 || feed.recent.length > 0;

  return (
    <PageShell width="md" className="gap-4 pb-8">
      <PageHeader
        title="Noticias"
        description="Avisos y novedades del club"
        icon={<Megaphone aria-hidden="true" />}
        action={
          isAdmin ? (
            <Link
              href={"/admin/news?from=news" as Route}
              className="border-ink-300 bg-paper-card text-pool-deep hover:border-pool-blue focus-visible:ring-pool-blue inline-flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl border px-4 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <Settings2 aria-hidden="true" className="h-4 w-4" />
              Gestionar noticias
            </Link>
          ) : null
        }
      />

      {hasNews ? (
        <ul aria-label="Noticias del club" className="flex flex-col gap-3">
          {lead ? (
            <li>
              <NewsCard post={lead as NewsCardData} variant="featured" onReact={react} />
            </li>
          ) : null}
          {otherPinned.map((post) => (
            <li key={post.id}>
              <NewsCard post={post as NewsCardData} onReact={react} />
            </li>
          ))}
          {feed.recent.map((post) => (
            <li key={post.id}>
              <NewsCard post={post as NewsCardData} onReact={react} />
            </li>
          ))}
        </ul>
      ) : null}

      {!hasNews ? (
        <EmptyState
          icon={<Megaphone aria-hidden="true" className="h-6 w-6" />}
          title="Todavía no hay noticias"
          description="Los avisos y novedades del club aparecerán aquí en cuanto se publiquen."
        />
      ) : null}

      {feed.total > 10 ? (
        <nav
          aria-label="Páginas de noticias"
          className="border-ink-200 flex items-center justify-between gap-2 border-t pt-4"
        >
          {page > 1 ? (
            <Link
              href={`/news?page=${page - 1}` as Route}
              className="border-ink-300 bg-paper-card text-pool-deep focus-visible:ring-pool-blue inline-flex min-h-12 items-center gap-1 rounded-xl border px-3 text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-ink-700 text-sm font-bold">Página {page}</span>
          {page * 10 < feed.total ? (
            <Link
              href={`/news?page=${page + 1}` as Route}
              className="border-ink-300 bg-paper-card text-pool-deep focus-visible:ring-pool-blue inline-flex min-h-12 items-center gap-1 rounded-xl border px-3 text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none"
            >
              Siguiente <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </PageShell>
  );
}
