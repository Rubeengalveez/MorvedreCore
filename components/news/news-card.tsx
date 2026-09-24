"use client";

import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { ArrowUpRight, ThumbsDown, ThumbsUp } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";

import { Avatar } from "@/components/ui/avatar";
import { NewsStoryMeta } from "@/components/news/news-story-meta";
import {
  NEWS_REACTIONS,
  summarizeBody,
  type NewsReaction,
  type ReactionTally,
} from "@/lib/domain/news";
import { cn } from "@/lib/utils/cn";

export interface NewsCardData {
  id: string;
  author_id: string;
  author_name: string;
  author_photo_url: string | null;
  title: string;
  body_md: string;
  image_url: string | null;
  audience: "club" | "team";
  audience_team_label: string | null;
  pinned: boolean;
  published_at: string;
  expires_at: string | null;
  reactions: ReactionTally[];
  my_reactions: string[];
  total_reactions: number;
}

export interface NewsCardProps {
  post: NewsCardData;
  variant?: "featured" | "feed" | "compact";
  onReact?: (postId: string, reaction: NewsReaction) => Promise<void>;
  canReact?: boolean;
}

const REACTION_ICON = {
  like: ThumbsUp,
  dislike: ThumbsDown,
} as const;

export function NewsCard({ post, variant = "feed", onReact, canReact = true }: NewsCardProps) {
  const featured = variant === "featured";
  const summary = summarizeBody(post.body_md, featured ? 235 : 155);
  const href = `/news/${post.id}` as Route;

  if (featured) {
    return (
      <article
        data-news-card={post.id}
        className="bg-pool-deep text-paper shadow-elev-3 border-pool-blue/30 overflow-hidden rounded-[1.5rem] border"
      >
        <Link
          href={href}
          className="focus-visible:ring-ball-gold relative block overflow-hidden focus-visible:ring-2 focus-visible:outline-none"
        >
          {post.image_url ? (
            <div className="bg-pool-blue/30 relative aspect-[16/8] overflow-hidden sm:aspect-[16/7]">
              <Image
                src={post.image_url}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
              />
            </div>
          ) : (
            <span
              className="lane-pattern pointer-events-none absolute inset-0 opacity-20"
              aria-hidden="true"
            />
          )}
          <div className="relative flex flex-col gap-3 p-5 sm:p-6">
            <NewsStoryMeta
              audience={post.audience}
              teamLabel={post.audience_team_label}
              publishedAt={post.published_at}
              pinned
              inverse
            />
            <div>
              <h2 className="font-display text-2xl leading-[1.15] font-extrabold text-balance break-words sm:text-3xl">
                {post.title}
              </h2>
              {summary ? (
                <p className="text-paper/85 mt-2 line-clamp-3 text-sm leading-relaxed sm:text-base">
                  {summary}
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-paper/85 flex min-w-0 items-center gap-2 text-xs font-semibold">
                <Avatar
                  src={post.author_photo_url}
                  name={post.author_name}
                  size={30}
                  className="shrink-0"
                />
                <span className="truncate">{post.author_name}</span>
              </span>
              <span className="text-ball-gold inline-flex shrink-0 items-center gap-1 text-sm font-extrabold">
                Leer noticia <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Link>
        <div className="px-5 pb-4 sm:px-6">
          <NewsReactions
            postId={post.id}
            reactions={post.reactions}
            myReactions={post.my_reactions}
            canReact={canReact}
            onReact={onReact}
            inverse
          />
        </div>
      </article>
    );
  }

  return (
    <article
      data-news-card={post.id}
      className={cn(
        "bg-paper-card shadow-elev-1 border-ink-200 overflow-hidden rounded-2xl border border-l-[3px]",
        post.pinned ? "border-l-ball-gold" : "border-l-pool-blue/70",
      )}
    >
      <Link
        href={href}
        className="focus-visible:ring-pool-blue block p-4 focus-visible:ring-2 focus-visible:outline-none sm:p-5"
      >
        <NewsStoryMeta
          audience={post.audience}
          teamLabel={post.audience_team_label}
          publishedAt={post.published_at}
          pinned={post.pinned}
        />
        <div className="mt-3 flex min-w-0 gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-pool-deep text-lg leading-snug font-extrabold break-words sm:text-xl">
              {post.title}
            </h2>
            {variant !== "compact" && summary ? (
              <p className="text-ink-700 mt-1.5 line-clamp-2 text-sm leading-relaxed">{summary}</p>
            ) : null}
          </div>
          {post.image_url ? (
            <span className="bg-pool-foam relative h-20 w-20 shrink-0 overflow-hidden rounded-xl sm:h-24 sm:w-28">
              <Image
                src={post.image_url}
                alt=""
                fill
                sizes="(max-width: 640px) 80px, 112px"
                className="object-cover"
              />
            </span>
          ) : null}
        </div>
        <div className="text-ink-600 mt-3 flex items-center justify-between gap-3 text-xs font-semibold">
          <span className="flex min-w-0 items-center gap-2">
            <Avatar
              src={post.author_photo_url}
              name={post.author_name}
              size={28}
              className="shrink-0"
            />
            <span className="min-w-0 truncate">Por {post.author_name}</span>
          </span>
          <span className="text-pool-blue inline-flex shrink-0 items-center gap-1 font-extrabold">
            Leer <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
          </span>
        </div>
      </Link>
      <div className="px-4 pb-3 sm:px-5">
        <NewsReactions
          postId={post.id}
          reactions={post.reactions}
          myReactions={post.my_reactions}
          canReact={canReact}
          onReact={onReact}
        />
      </div>
    </article>
  );
}

export function NewsReactions({
  postId,
  reactions,
  myReactions,
  onReact,
  canReact = true,
  inverse = false,
}: {
  postId: string;
  reactions: ReactionTally[];
  myReactions: string[];
  onReact?: (postId: string, reaction: NewsReaction) => Promise<void>;
  canReact?: boolean;
  inverse?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimistic, updateOptimistic] = useOptimistic(
    { reactions, myReactions },
    (current, reaction: NewsReaction) => {
      const previous = current.myReactions.find((item) => item === "like" || item === "dislike");
      const next = previous === reaction ? null : reaction;
      return {
        reactions: current.reactions.map((item) => ({
          ...item,
          count: Math.max(
            0,
            item.count - Number(item.reaction === previous) + Number(item.reaction === next),
          ),
          hasMine: item.reaction === next,
        })),
        myReactions: next ? [next] : [],
      };
    },
  );

  function react(reaction: NewsReaction) {
    if (!onReact) return;
    setError(null);
    startTransition(async () => {
      updateOptimistic(reaction);
      try {
        await onReact(postId, reaction);
      } catch {
        setError("No pudimos guardar tu reacción. Inténtalo de nuevo.");
      }
    });
  }

  return (
    <div>
      <div
        role="group"
        aria-label="Reacciones"
        aria-busy={isPending}
        data-reaction-bar
        className="grid grid-cols-2 gap-2"
      >
        {NEWS_REACTIONS.map((meta) => {
          const tally = optimistic.reactions.find((item) => item.reaction === meta.id);
          const count = tally?.count ?? 0;
          const mine = optimistic.myReactions.includes(meta.id);
          const ReactionIcon = REACTION_ICON[meta.id];
          return (
            <button
              key={meta.id}
              type="button"
              disabled={!canReact || isPending || !onReact}
              onClick={() => react(meta.id)}
              data-reaction={meta.id}
              data-mine={mine}
              aria-pressed={mine}
              aria-label={`${meta.label}: ${count} ${count === 1 ? "reacción" : "reacciones"}`}
              className={cn(
                "focus-visible:ring-pool-blue flex min-h-12 min-w-0 touch-manipulation flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 rounded-xl border px-2 py-2 text-xs font-bold transition-[background-color,border-color,color,transform] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97] motion-reduce:transition-none",
                inverse
                  ? mine
                    ? "border-ball-gold bg-ball-gold text-pool-deep"
                    : "border-paper/25 bg-paper/10 text-paper hover:bg-paper/20"
                  : mine
                    ? "border-pool-deep bg-pool-deep text-paper"
                    : "border-ink-200 bg-paper text-pool-deep hover:bg-pool-foam",
                (!canReact || !onReact) && "opacity-60",
              )}
            >
              <ReactionIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{meta.label}</span>
              <span className="font-mono tabular-nums">{count.toLocaleString("es-ES")}</span>
            </button>
          );
        })}
      </div>
      {error ? (
        <p
          role="alert"
          className={cn(
            "mt-2 text-xs font-semibold",
            inverse ? "text-ball-gold" : "text-goggle-red",
          )}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
