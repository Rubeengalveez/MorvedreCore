import type { Route } from "next";
import { notificationBackTarget } from "@/lib/domain/notifications";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getNewsPost } from "@/server/queries/news";
import { reactToNews } from "@/server/actions/admin/news";
import { Avatar } from "@/components/ui/avatar";
import { Markdown } from "@/components/ui/markdown";
import { PageShell } from "@/components/ui/page-shell";
import { PageBackLink } from "@/components/ui/page-back-link";
import { NewsReactions } from "@/components/news/news-card";
import { NewsStoryMeta } from "@/components/news/news-story-meta";
import type { NewsReaction } from "@/lib/domain/news";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getActiveProfileContext();
  if (!ctx) return { title: "Noticia — Morvedre Core" };
  const post = await getNewsPost(id, ctx.activeProfile.id);
  if (!post) return { title: "Noticia — Morvedre Core" };
  return { title: `${post.title} — Morvedre Core` };
}

export default async function NewsDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; notificationId?: string }>;
}) {
  const origin = await searchParams;
  const notification = notificationBackTarget(origin.from, origin.notificationId);
  const { id } = await params;
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const { activeProfile } = ctx;

  const post = await getNewsPost(id, activeProfile.id);
  if (!post) notFound();

  async function react(_postId: string, reaction: NewsReaction) {
    "use server";
    await reactToNews({ post_id: id, reaction });
  }

  return (
    <PageShell width="md" className="gap-4 pb-8">
      <PageBackLink
        href={
          (notification?.href ?? (origin.from === "dashboard" ? "/dashboard" : "/news")) as Route
        }
      >
        {notification?.label ?? (origin.from === "dashboard" ? "Inicio" : "Todas las noticias")}
      </PageBackLink>
      <article className="border-pool-deep/65 overflow-hidden rounded-[1.5rem] border bg-paper-card shadow-elev-2">
        <div className="h-2 bg-pool-deep" aria-hidden="true" />
        <header className="bg-pool-ice/60 border-pool-deep/65 relative overflow-hidden p-5 sm:p-8">
          <span
            className="lane-pattern pointer-events-none absolute inset-0 opacity-15"
            aria-hidden="true"
          />
          <div className="relative">
            <NewsStoryMeta
              audience={post.audience}
              teamLabel={post.audience_team_label}
              publishedAt={post.published_at}
              pinned={post.pinned}
            />
            <h1 className="mt-5 text-balance break-words font-display text-3xl font-extrabold leading-[1.12] tracking-tight text-pool-deep sm:text-4xl">
              {post.title}
            </h1>
            <div className="mt-5 flex items-center gap-2.5 text-sm font-semibold text-ink-700">
              <Avatar
                src={post.author_photo_url}
                name={post.author_name}
                size={36}
                className="shrink-0"
              />
              <span>Por {post.author_name}</span>
            </div>
          </div>
        </header>

        {post.image_url ? (
          <div className="relative aspect-[16/9] overflow-hidden bg-pool-foam">
            <Image
              src={post.image_url}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
        ) : null}

        <div className="px-5 pb-7 pt-6 sm:px-8 sm:pb-9 sm:pt-8">
          <Markdown className="text-base leading-7">{post.body_md}</Markdown>
          <div className="mt-8">
            <p className="mb-2 font-display text-sm font-extrabold text-pool-deep">Tu reacción</p>
            <NewsReactions
              postId={post.id}
              reactions={post.reactions}
              myReactions={post.my_reactions}
              onReact={react}
            />
          </div>
        </div>
      </article>
    </PageShell>
  );
}
