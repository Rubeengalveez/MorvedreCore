"use client";

import Link from "next/link";
import type { Route } from "next";
import { Pin, Clock, Heart, Flame, HandHeart } from "lucide-react";
import { useTransition } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Markdown } from "@/components/ui/markdown";
import { LanePattern } from "@/components/ui/lane-pattern";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import { Equipo, Gorro } from "@/components/brand/pictograms";
import { cn } from "@/lib/utils/cn";
import { NEWS_REACTIONS, relativeTime, summarizeBody, type ReactionTally } from "@/lib/domain/news";

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
  variant?: "feed" | "compact";
  onReact?: (postId: string, reaction: "like" | "fire" | "thanks") => Promise<void>;
  canReact?: boolean;
}

const REACTION_ICON = {
  like: Heart,
  fire: Flame,
  thanks: HandHeart,
} as const;

export function NewsCard({ post, variant = "feed", onReact, canReact = true }: NewsCardProps) {
  const summary = summarizeBody(post.body_md, 200);
  const href = `/news/${post.id}` as Route;

  return (
    <article
      data-news-card={post.id}
      className={cn(
        "bg-paper-card shadow-elev-1 relative overflow-hidden rounded-2xl border",
        post.pinned ? "border-ball-gold" : "border-ink-300",
      )}
    >
      {post.pinned ? (
        <div
          aria-hidden="true"
          className="bg-ball-gold/15 text-pool-deep absolute inset-x-0 top-0 flex items-center gap-1.5 px-4 py-1.5 text-xs font-extrabold tracking-wide uppercase"
        >
          <Pin className="h-3 w-3" />
          Fijada
        </div>
      ) : null}
      <div className={cn("flex flex-col gap-3 p-4", post.pinned && "pt-9")}>
        <div className="flex items-start gap-2.5">
          <Avatar
            src={post.author_photo_url}
            name={post.author_name}
            size={36}
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-eyebrow text-ink-600">
              <Link href={href} className="hover:underline">
                {post.author_name}
              </Link>
              {post.audience === "team" && post.audience_team_label ? (
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
            <Link
              href={href}
              className="font-display text-pool-deep text-lg leading-tight font-extrabold break-words hover:underline"
            >
              {post.title}
            </Link>
            <p className="text-ink-600 mt-1 inline-flex items-center gap-1 text-sm">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {relativeTime(post.published_at)}
              {post.expires_at ? (
                <>
                  <span className="text-ink-300 mx-1">·</span>
                  <span className="text-ink-500">Caduca {relativeTime(post.expires_at)}</span>
                </>
              ) : null}
            </p>
          </div>
          {post.audience === "team" && post.audience_team_label ? (
            <PictogramBadge pictogram={Equipo} color="var(--ball-gold)" size="sm" />
          ) : (
            <PictogramBadge pictogram={Gorro} color="var(--pool-deep)" size="sm" />
          )}
        </div>

        {post.image_url ? (
          <div
            aria-hidden="true"
            className="-mx-3 overflow-hidden"
            style={{ backgroundColor: "var(--pool-foam)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.image_url}
              alt=""
              width={720}
              height={360}
              className="h-44 w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : null}

        {variant === "feed" ? (
          <LanePattern as="div" className="bg-pool-foam/30 -mx-3 -mb-3 rounded-b-md" strong={false}>
            <div className="px-3 py-2">
              <Markdown className="text-sm leading-relaxed">{summary}</Markdown>
              <Link
                href={href}
                className="text-pool-blue focus-visible:ring-pool-blue mt-2 inline-flex min-h-11 items-center gap-1 rounded-lg text-sm font-extrabold hover:underline focus-visible:ring-2 focus-visible:outline-none"
              >
                Leer más
              </Link>
            </div>
          </LanePattern>
        ) : null}

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
}: {
  postId: string;
  reactions: ReactionTally[];
  myReactions: string[];
  onReact?: (postId: string, reaction: "like" | "fire" | "thanks") => Promise<void>;
  canReact?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function react(reaction: "like" | "fire" | "thanks") {
    if (!onReact) return;
    startTransition(async () => {
      try {
        await onReact(postId, reaction);
      } catch (err) {
        console.error(err);
      }
    });
  }

  return (
    <ReactionBar
      reactions={reactions}
      myReactions={myReactions}
      disabled={!canReact || isPending || !onReact}
      onReact={react}
    />
  );
}

function ReactionBar({
  reactions,
  myReactions,
  disabled,
  onReact,
}: {
  reactions: ReactionTally[];
  myReactions: string[];
  disabled: boolean;
  onReact: (reaction: "like" | "fire" | "thanks") => void;
}) {
  return (
    <div
      role="group"
      aria-label="Reaccionar"
      data-reaction-bar
      className="border-ink-300 flex flex-wrap items-center gap-1.5 border-t pt-2"
    >
      {NEWS_REACTIONS.map((meta) => {
        const tally = reactions.find((r) => r.reaction === meta.id);
        const count = tally?.count ?? 0;
        const mine = (myReactions ?? []).includes(meta.id);
        const ReactionIcon = REACTION_ICON[meta.id];
        return (
          <button
            key={meta.id}
            type="button"
            disabled={disabled}
            onClick={() => onReact(meta.id)}
            data-reaction={meta.id}
            data-mine={mine}
            aria-pressed={mine}
            aria-label={`${meta.emoji}: ${count}`}
            className={cn(
              "focus-visible:ring-pool-blue inline-flex min-h-11 touch-manipulation items-center gap-1.5 rounded-full border px-3 text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none",
              mine
                ? "border-pool-deep bg-pool-deep text-paper"
                : count > 0
                  ? "border-pool-blue/30 bg-pool-foam text-pool-deep hover:bg-pool-foam/70"
                  : "border-ink-300 bg-paper text-ink-600 hover:bg-pool-foam/40",
              disabled && "opacity-50",
            )}
          >
            <ReactionIcon className="h-4 w-4" aria-hidden="true" />
            <span className="font-mono tabular-nums">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
