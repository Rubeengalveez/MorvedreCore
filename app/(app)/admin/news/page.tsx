import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight, Megaphone, Plus } from "lucide-react";

import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-page";
import { NewsAdminActions } from "@/components/news/news-admin-actions";
import { EmptyState } from "@/components/ui/empty-state";
import { getNewsForAdmin, getNewsTeamsForAdmin } from "@/server/queries/news";
import { summarizeBody } from "@/lib/domain/news";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Noticias (admin) — Morvedre Core",
  description: "Gestión de noticias y tablón.",
};

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Madrid",
});

export default async function AdminNewsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const fromNews = (await searchParams).from === "news";
  const [posts, teams] = await Promise.all([getNewsForAdmin(), getNewsTeamsForAdmin()]);
  const teamLabels = new Map(teams.map((team) => [team.id, team.label]));
  const editorSuffix = fromNews ? "?from=news" : "";
  const ordered = [...posts].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || b.published_at.localeCompare(a.published_at),
  );

  return (
    <AdminPageShell width="lg" className="gap-5">
      <AdminPageHeader
        title="Noticias"
        description="Prepara los avisos que verá el club y mantén el tablón al día."
        icon={<Megaphone aria-hidden="true" className="h-6 w-6" />}
        action={
          <Link
            href={`/admin/news/new${editorSuffix}` as Route}
            className="bg-pool-deep text-paper hover:bg-pool-blue focus-visible:ring-pool-blue inline-flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:w-auto"
          >
            <Plus aria-hidden="true" className="h-5 w-5" /> Nueva noticia
          </Link>
        }
      />

      {ordered.length === 0 ? (
        <EmptyState
          icon={<Megaphone aria-hidden="true" className="h-6 w-6" />}
          title="Todavía no hay noticias"
          description="Publica el primer aviso para que todo el club lo vea en su tablón."
          action={
            <Link
              href={`/admin/news/new${editorSuffix}` as Route}
              className="bg-pool-deep text-paper inline-flex min-h-12 w-full items-center justify-center rounded-xl px-4 text-sm font-extrabold"
            >
              Crear noticia
            </Link>
          }
        />
      ) : (
        <section aria-labelledby="news-management-heading" className="flex flex-col gap-3">
          <div className="border-ink-200 flex items-center justify-between gap-3 border-b pb-2">
            <h2
              id="news-management-heading"
              className="font-display text-pool-deep text-xl font-extrabold"
            >
              Publicadas
            </h2>
            {!fromNews ? (
              <Link
                href={"/news" as Route}
                className="text-pool-blue hover:text-pool-deep focus-visible:ring-pool-blue inline-flex min-h-12 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-bold focus-visible:ring-2 focus-visible:outline-none"
              >
                Ver Noticias <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
          <ul className="flex flex-col gap-3">
            {ordered.map((post) => (
              <li key={post.id}>
                <article className="bg-paper-card shadow-elev-1 border-ink-200 overflow-hidden rounded-2xl border">
                  <div className="flex min-w-0 gap-3 p-4 sm:gap-4 sm:p-5">
                    <div className="bg-pool-foam relative hidden h-24 w-24 shrink-0 overflow-hidden rounded-xl sm:block">
                      {post.image_url ? (
                        <Image
                          src={post.image_url}
                          alt=""
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-pool-blue flex h-full items-center justify-center">
                          <Megaphone aria-hidden="true" className="h-8 w-8" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                        {post.pinned ? (
                          <span className="bg-ball-gold/25 text-pool-deep rounded-full px-2 py-1">
                            Destacada
                          </span>
                        ) : null}
                        <span className="bg-pool-foam text-pool-deep rounded-full px-2 py-1">
                          {post.audience === "team"
                            ? (teamLabels.get(post.audience_team_id ?? "") ?? "Equipo")
                            : "Todo el club"}
                        </span>
                        <time dateTime={post.published_at} className="text-ink-600">
                          {dateFormatter.format(new Date(post.published_at))}
                        </time>
                      </div>
                      <h3 className="font-display text-pool-deep mt-2 text-lg leading-tight font-extrabold break-words">
                        <Link
                          href={`/admin/news/${post.id}${editorSuffix}` as Route}
                          className="focus-visible:ring-pool-blue rounded focus-visible:ring-2 focus-visible:outline-none"
                        >
                          {post.title}
                        </Link>
                      </h3>
                      <p className="text-ink-700 mt-1 line-clamp-2 text-sm leading-relaxed">
                        {summarizeBody(post.body_md, 145)}
                      </p>
                      {post.expires_at ? (
                        <p className="text-ink-600 mt-1.5 text-xs font-semibold">
                          Caduca el {dateFormatter.format(new Date(post.expires_at))}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="border-ink-200 border-t px-4 py-2.5 sm:px-5">
                    <NewsAdminActions
                      postId={post.id}
                      title={post.title}
                      pinned={post.pinned}
                      fromNews={fromNews}
                    />
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AdminPageShell>
  );
}
