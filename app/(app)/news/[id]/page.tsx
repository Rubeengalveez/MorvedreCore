import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Pin, Clock, ArrowLeft } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getNewsPost } from "@/server/queries/news";
import { reactToNews } from "@/server/actions/admin/news";
import { Avatar } from "@/components/ui/avatar";
import { Markdown } from "@/components/ui/markdown";
import { PageShell } from "@/components/ui/page-shell";
import { NewsReactions } from "@/components/news/news-card";
import { relativeTime } from "@/lib/domain/news";

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

  async function react(_postId: string, reaction: "like" | "fire" | "thanks") {
    "use server";
    await reactToNews({ post_id: id, reaction });
  }

  return (
    <PageShell width="md" className="gap-4 pb-8">
      <Link
        href={"/news" as Route}
        className="text-pool-blue hover:text-pool-deep focus-visible:ring-pool-blue inline-flex min-h-11 w-fit items-center gap-2 rounded-lg text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Todas las noticias
      </Link>
      <article className="border-ink-200 bg-paper-card shadow-elev-2 rounded-2xl border p-5 sm:p-7">
        {post.pinned ? (
          <div className="bg-ball-gold/15 text-pool-deep mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold uppercase">
            <Pin className="h-3.5 w-3.5" aria-hidden="true" />
            Fijada
          </div>
        ) : null}
        <div className="flex items-start gap-3">
          <Avatar
            src={post.author_photo_url}
            name={post.author_name}
            size={48}
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-eyebrow text-ink-600">
              {post.author_name}
              {post.audience_team_label ? (
                <>
                  <span className="text-ink-300 mx-1">·</span>
                  <span className="text-ink-600">{post.audience_team_label}</span>
                </>
              ) : (
                <>
                  <span className="text-ink-300 mx-1">·</span>
                  <span className="text-ink-600">Club</span>
                </>
              )}
            </p>
            <h1 className="font-display text-pool-deep text-3xl leading-tight font-extrabold text-balance break-words">
              {post.title}
            </h1>
            <p className="text-ink-600 mt-1 inline-flex items-center gap-1.5 text-sm">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {relativeTime(post.published_at)}
            </p>
          </div>
        </div>
        {post.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image_url}
            alt=""
            width={960}
            height={540}
            className="mt-5 aspect-video w-full rounded-xl object-cover"
            loading="lazy"
          />
        ) : null}
        <div className="mt-5">
          <Markdown>{post.body_md}</Markdown>
        </div>
        <div className="mt-6">
          <NewsReactions
            postId={post.id}
            reactions={post.reactions}
            myReactions={post.my_reactions}
            onReact={react}
          />
        </div>
      </article>
    </PageShell>
  );
}
