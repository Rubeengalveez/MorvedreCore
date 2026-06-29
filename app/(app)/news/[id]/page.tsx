import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Pin, Clock, ArrowLeft } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getNewsPost } from "@/server/queries/news";
import { reactToNews } from "@/server/actions/admin/news";
import { Avatar } from "@/components/ui/avatar";
import { LanePattern } from "@/components/ui/lane-pattern";
import { Markdown } from "@/components/ui/markdown";
import { NewsCard, type NewsCardData } from "@/components/news/news-card";
import { relativeTime } from "@/lib/domain/news";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getActiveProfileContext();
  if (!ctx) return { title: "Noticia — Morvedre Core" };
  const post = await getNewsPost(id, ctx.activeProfile.id);
  if (!post) return { title: "Noticia — Morvedre Core" };
  return { title: `${post.title} — Morvedre Core` };
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0" />
      <div className="relative z-[1] mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4">
        <Link
          href={"/news" as Route}
          className="inline-flex items-center gap-1 text-xs font-bold text-pool-blue hover:underline"
        >
          <ArrowLeft className="h-3 w-3" />
          Noticias
        </Link>
        <article className="rounded-md border border-ink-300 bg-paper-card p-4 shadow-elev-1">
          {post.pinned ? (
            <div className="mb-2 inline-flex items-center gap-1 rounded-sm bg-ball-gold/15 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-pool-deep">
              <Pin className="h-3 w-3" />
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
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
                {post.author_name}
                {post.audience_team_label ? (
                  <>
                    <span className="mx-1 text-ink-300">·</span>
                    <span className="text-ink-600">{post.audience_team_label}</span>
                  </>
                ) : (
                  <>
                    <span className="mx-1 text-ink-300">·</span>
                    <span className="text-ink-600">Club</span>
                  </>
                )}
              </p>
              <h1 className="break-words font-display text-2xl font-extrabold leading-tight text-pool-deep">
                {post.title}
              </h1>
              <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-ink-600">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {relativeTime(post.published_at)}
              </p>
            </div>
          </div>
          {post.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.image_url}
              alt=""
              className="mt-3 h-56 w-full rounded-md object-cover"
              loading="lazy"
            />
          ) : null}
          <div className="mt-3">
            <Markdown>{post.body_md}</Markdown>
          </div>
        </article>
        <NewsCard
          post={post as NewsCardData}
          canReact={true}
          onReact={react}
        />
      </div>
    </div>
  );
}
