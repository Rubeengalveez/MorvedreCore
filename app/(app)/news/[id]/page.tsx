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
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0" />
      <div className="relative z-[1] mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4">
        <Link
          href={"/news" as Route}
          className="text-pool-blue inline-flex items-center gap-1 text-xs font-bold hover:underline"
        >
          <ArrowLeft className="h-3 w-3" />
          Noticias
        </Link>
        <article className="border-ink-300 bg-paper-card shadow-elev-1 rounded-md border p-4">
          {post.pinned ? (
            <div className="bg-ball-gold/15 text-pool-deep mb-2 inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase">
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
              <h1 className="font-display text-pool-deep text-2xl leading-tight font-extrabold break-words">
                {post.title}
              </h1>
              <p className="text-ink-600 mt-0.5 inline-flex items-center gap-1 text-[11px]">
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
        <NewsCard post={post as NewsCardData} canReact={true} onReact={react} />
      </div>
    </div>
  );
}
