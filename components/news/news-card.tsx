"use client";

import Link from "next/link";
import type { Route } from "next";
import { Pin, Clock, Users } from "lucide-react";
import { useTransition } from "react";

import { Avatar } from "@/components/ui/avatar";
import { CapTile } from "@/components/ui/cap-tile";
import { Markdown } from "@/components/ui/markdown";
import { LanePattern } from "@/components/ui/lane-pattern";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import { Equipo, Gorro } from "@/components/brand/pictograms";
import { cn } from "@/lib/utils/cn";
import {
  NEWS_REACTIONS,
  relativeTime,
  summarizeBody,
  type ReactionTally,
} from "@/lib/domain/news";

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

export function NewsCard({ post, variant = "feed", onReact, canReact = true }: NewsCardProps) {
  const [isPending, startTransition] = useTransition();
  const summary = summarizeBody(post.body_md, 200);
  const href = `/news/${post.id}` as Route;

  function react(reaction: "like" | "fire" | "thanks") {
    if (!onReact) return;
    startTransition(async () => {
      try {
        await onReact!(post.id, reaction);
      } catch (err) {
        console.error(err);
      }
    });
  }

  return (
    <article
      data-news-card={post.id}
      className={cn(
        "relative overflow-hidden rounded-md border bg-paper-card shadow-elev-1",
        post.pinned ? "border-ball-gold" : "border-ink-300",
      )}
    >
      {post.pinned ? (
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 flex items-center gap-1.5 bg-ball-gold/15 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-pool-deep"
        >
          <Pin className="h-3 w-3" />
          Fijada
        </div>
      ) : null}
      <div className={cn("flex flex-col gap-2 p-3", post.pinned && "pt-7")}>
        <div className="flex items-start gap-2.5">
          <Avatar
            src={post.author_photo_url}
            name={post.author_name}
            size={36}
            className="shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-600">
              <Link href={href} className="hover:underline">
                {post.author_name}
              </Link>
              {post.audience === "team" && post.audience_team_label ? (
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
            <Link
              href={href}
              className="break-words font-display text-lg font-extrabold leading-tight text-pool-deep hover:underline"
            >
              {post.title}
            </Link>
            <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-ink-600">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {relativeTime(post.published_at)}
              {post.expires_at ? (
                <>
                  <span className="mx-1 text-ink-300">·</span>
                  <span className="text-ink-500">
                    Caduca {relativeTime(post.expires_at)}
                  </span>
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
              className="h-40 w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : null}

        {variant === "feed" ? (
          <LanePattern as="div" className="-mx-3 -mb-3 rounded-b-md bg-pool-foam/30" strong={false}>
            <div className="px-3 py-2">
              <Markdown className="text-sm leading-relaxed">{summary}</Markdown>
              <Link
                href={href}
                className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-pool-blue hover:underline"
              >
                Leer más
              </Link>
            </div>
          </LanePattern>
        ) : null}

        <ReactionBar
          reactions={post.reactions}
          myReactions={post.my_reactions}
          disabled={!canReact || isPending || !onReact}
          onReact={react}
        />
      </div>
    </article>
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
      className="flex flex-wrap items-center gap-1.5 border-t border-ink-300 pt-2"
    >
      {NEWS_REACTIONS.map((meta) => {
        const tally = reactions.find((r) => r.reaction === meta.id);
        const count = tally?.count ?? 0;
        const mine = (myReactions ?? []).includes(meta.id);
        return (
          <button
            key={meta.id}
            type="button"
            disabled={disabled}
            onClick={() => onReact(meta.id)}
            data-reaction={meta.id}
            data-mine={mine}
            aria-pressed={mine}
            className={cn(
              "inline-flex h-8 min-h-8 items-center gap-1 rounded-full border px-2.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue",
              mine
                ? "border-pool-deep bg-pool-deep text-paper"
                : count > 0
                  ? "border-pool-blue/30 bg-pool-foam text-pool-deep hover:bg-pool-foam/70"
                  : "border-ink-300 bg-paper text-ink-600 hover:bg-pool-foam/40",
              disabled && "opacity-50",
            )}
          >
            <span aria-hidden="true">{meta.emoji.split(" ")[0]}</span>
            <span className="font-mono tabular-nums">{count}</span>
          </button>
        );
      })}
    </div>
  );
}

void CapTile;
void Users;
