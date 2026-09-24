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

export default async function NewsDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
      <PageBackLink href="/news">Todas las noticias</PageBackLink>
      <article className="bg-paper-card shadow-elev-2 border-ink-200 overflow-hidden rounded-[1.5rem] border">
        <div className="bg-pool-deep h-2" aria-hidden="true" />
        <header className="bg-pool-ice/60 border-ink-200 relative overflow-hidden border-b p-5 sm:p-8">
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
            <h1 className="font-display text-pool-deep mt-5 text-3xl leading-[1.12] font-extrabold tracking-tight text-balance break-words sm:text-4xl">
              {post.title}
            </h1>
            <div className="text-ink-700 mt-5 flex items-center gap-2.5 text-sm font-semibold">
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
          <div className="bg-pool-foam relative aspect-[16/9] overflow-hidden">
            <Image
              src={post.image_url}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
        ) : null}

        <div className="px-5 pt-6 pb-7 sm:px-8 sm:pt-8 sm:pb-9">
          <Markdown className="text-base leading-7">{post.body_md}</Markdown>
          <div className="mt-8">
            <p className="font-display text-pool-deep mb-2 text-sm font-extrabold">Tu reacción</p>
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
