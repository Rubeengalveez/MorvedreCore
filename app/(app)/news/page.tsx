import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Megaphone, Pin, Settings } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getNewsFeed } from "@/server/queries/news";
import { reactToNews } from "@/server/actions/admin/news";
import { createClient } from "@/lib/supabase/server";
import { AppPageHero } from "@/components/ui/app-page-hero";
import { EmptyState } from "@/components/ui/empty-state";
import { PageShell } from "@/components/ui/page-shell";
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

  const feed = await getNewsFeed({
    myProfileId: activeProfile.id,
    page,
    pageSize: 10,
  });

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

  async function react(postId: string, reaction: "like" | "fire" | "thanks") {
    "use server";
    await reactToNews({ post_id: postId, reaction });
  }

  return (
    <PageShell width="md" className="gap-6 pb-8">
      <AppPageHero
        eyebrow="Tablón del club"
        title="Noticias"
        description="Avisos, resultados y novedades del Waterpolo Morvedre."
        icon={<Megaphone className="h-6 w-6" aria-hidden="true" />}
        action={
          isAdmin ? (
            <Link
              href={"/admin/news" as Route}
              className="border-ink-200 bg-paper-card text-pool-deep hover:bg-pool-foam focus-visible:ring-pool-blue inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none min-[420px]:w-auto"
            >
              <Settings className="h-4 w-4" aria-hidden="true" /> Gestionar noticias
            </Link>
          ) : undefined
        }
      />

      {feed.pinned.length > 0 ? (
        <section aria-labelledby="pinned-heading" className="flex flex-col gap-2">
          <h2
            id="pinned-heading"
            className="text-eyebrow text-ink-600 inline-flex items-center gap-1"
          >
            <Pin className="h-3 w-3" aria-hidden="true" />
            Fijadas
          </h2>
          <ul className="flex flex-col gap-3">
            {feed.pinned.map((p) => (
              <li key={p.id}>
                <NewsCard post={p as NewsCardData} canReact={true} onReact={react} />
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
          <EmptyState
            icon={<Megaphone className="h-6 w-6" aria-hidden="true" />}
            title="Todavía no hay noticias"
            description="Los avisos del club aparecerán aquí en cuanto se publiquen."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {feed.recent.map((p) => (
              <li key={p.id}>
                <NewsCard post={p as NewsCardData} canReact={true} onReact={react} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {feed.total > 0 ? (
        <nav aria-label="Paginación" className="flex items-center justify-center gap-2 pt-1">
          {page > 1 ? (
            <Link
              href={`/news?page=${page - 1}` as Route}
              className="border-ink-300 bg-paper text-pool-deep hover:bg-pool-foam focus-visible:ring-pool-blue inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              ← Anterior
            </Link>
          ) : null}
          <span className="text-ink-600 text-sm font-bold">Página {page}</span>
          {page * 10 < feed.total ? (
            <Link
              href={`/news?page=${page + 1}` as Route}
              className="border-ink-300 bg-paper text-pool-deep hover:bg-pool-foam focus-visible:ring-pool-blue inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              Siguiente →
            </Link>
          ) : null}
        </nav>
      ) : null}
    </PageShell>
  );
}
