import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  Bell,
  Check,
  Calendar,
  Trophy,
  Volleyball,
  Megaphone,
  XCircle,
  ChevronRight,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/domain/calendar";
import { cn } from "@/lib/utils/cn";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import {
  getNotificationsForProfile,
  getUnreadNotificationsCount,
  type NotificationItem,
} from "@/server/queries/notifications";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Notificaciones — Morvedre Core",
  description: "Tus avisos y notificaciones del club.",
};

const KIND_META: Record<
  string,
  { label: string; Icon: typeof Calendar; color: string; tone: string }
> = {
  convocatoria: {
    label: "Convocatoria",
    Icon: Trophy,
    color: "var(--brand-action)",
    tone: "border-brand-action/30 bg-brand-action/5",
  },
  match_reminder: {
    label: "Recordatorio",
    Icon: Calendar,
    color: "var(--brand-blue)",
    tone: "border-brand-blue/30 bg-brand-blue/5",
  },
  training_cancelled: {
    label: "Entreno cancelado",
    Icon: XCircle,
    color: "var(--danger)",
    tone: "border-danger/30 bg-danger/5",
  },
  news_pinned: {
    label: "Noticia",
    Icon: Megaphone,
    color: "var(--brand-aqua)",
    tone: "border-brand-aqua/30 bg-brand-aqua/5",
  },
  result_published: {
    label: "Resultado",
    Icon: Trophy,
    color: "var(--success)",
    tone: "border-success/30 bg-success/5",
  },
  monthly_close: {
    label: "Cierre mensual",
    Icon: Volleyball,
    color: "var(--ink-600)",
    tone: "border-ink-300 bg-paper",
  },
};

interface MatchContext {
  id: string;
  opponent: string;
  scheduled_at: string;
  team_label: string;
  team_color: string;
}

async function loadContextForNotifications(
  items: NotificationItem[],
): Promise<{ matchById: Map<string, MatchContext>; photoByProfile: Map<string, string | null> }> {
  const matchById = new Map<string, MatchContext>();
  const photoByProfile = new Map<string, string | null>();
  if (items.length === 0) return { matchById, photoByProfile };

  const supabase = await createClient();
  const matchIds = Array.from(
    new Set(items.map((i) => i.related_match_id).filter((v): v is string => v != null)),
  );

  if (matchIds.length > 0) {
    const { data } = await supabase
      .from("matches")
      .select("id, opponent, scheduled_at, teams!matches_team_id_fkey(label, color)")
      .in("id", matchIds);
    for (const m of (data ?? []) as Array<{
      id: string;
      opponent: string;
      scheduled_at: string;
      teams: unknown;
    }>) {
      const team = Array.isArray(m.teams) ? m.teams[0] : m.teams;
      const teamObj = team as { label?: string; color?: string } | null;
      matchById.set(m.id, {
        id: m.id,
        opponent: m.opponent,
        scheduled_at: m.scheduled_at,
        team_label: teamObj?.label ?? "",
        team_color: teamObj?.color ?? "var(--brand-blue)",
      });
    }
  }

  const profileIds = Array.from(
    new Set(items.map((i) => i.recipient_id).filter((v): v is string => v != null)),
  );
  if (profileIds.length > 0) {
    const { data } = await supabase.from("profiles").select("id, photo_url").in("id", profileIds);
    for (const p of (data ?? []) as Array<{ id: string; photo_url: string | null }>) {
      photoByProfile.set(p.id, p.photo_url);
    }
  }

  return { matchById, photoByProfile };
}

export default async function NotificationsPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");

  const [items, unread] = await Promise.all([
    getNotificationsForProfile(ctx.activeProfile.id, 100).catch(() => [] as NotificationItem[]),
    getUnreadNotificationsCount(ctx.activeProfile.id).catch(() => 0),
  ]);

  const { matchById, photoByProfile } = await loadContextForNotifications(items);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4">
      <header className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-brand-deep text-[28px] leading-[1.1] font-extrabold tracking-tight">
            Notificaciones
          </h1>
          <p className="text-ink-600 text-sm">
            {unread > 0
              ? `${unread} sin leer de ${items.length} totales.`
              : "Estás al día con todo."}
          </p>
        </div>
        <Bell className="text-brand-deep hidden h-7 w-7 sm:block" />
      </header>

      {items.length === 0 ? (
        <div className="border-ink-300 bg-paper flex flex-col items-center gap-3 rounded-md border border-dashed p-8 text-center">
          <Check className="text-success h-10 w-10" />
          <p className="text-ink-600 text-sm">
            Sin novedades. Cuando convoquen a un jugador o cancelen un entreno, aparecerá aquí.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => (
            <NotificationRow
              key={n.id}
              item={n}
              match={n.related_match_id ? (matchById.get(n.related_match_id) ?? null) : null}
              photoUrl={photoByProfile.get(n.recipient_id) ?? null}
            />
          ))}
        </ul>
      )}

      <div className="flex justify-end">
        <Button asChild variant="secondary" size="md">
          <Link href={"/calendar" as Route}>Volver al calendario</Link>
        </Button>
      </div>
    </div>
  );
}

function formatClock(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDayShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function NotificationRow({
  item,
  match,
  photoUrl,
}: {
  item: NotificationItem;
  match: MatchContext | null;
  photoUrl: string | null;
}) {
  const meta = KIND_META[item.kind] ?? {
    label: item.kind,
    Icon: Megaphone,
    color: "var(--ink-600)",
    tone: "border-ink-300 bg-paper",
  };
  const Icon = meta.Icon;
  const isUnread = item.read_at == null;

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-md border p-4",
        isUnread ? meta.tone : "border-ink-300 bg-paper",
      )}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{
          backgroundColor: `color-mix(in oklab, ${meta.color} 15%, var(--paper))`,
        }}
      >
        <Icon className="h-4 w-4" style={{ color: meta.color }} />
      </span>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-display text-brand-deep text-base font-bold">{item.title}</span>
          <span
            className="text-paper rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase"
            style={{ backgroundColor: meta.color }}
          >
            {meta.label}
          </span>
        </div>
        {item.kind === "convocatoria" && match ? (
          <div
            className="border-ink-300 bg-paper flex items-center gap-2 rounded-md border p-2"
            style={{ borderLeftWidth: "3px", borderLeftColor: match.team_color }}
          >
            <Avatar src={photoUrl} name={item.title} size={28} />
            <div className="min-w-0 flex-1">
              <p className="text-brand-deep line-clamp-1 text-sm font-semibold">
                vs {match.opponent}
              </p>
              <p className="text-ink-600 text-[10px]">
                {formatDayShort(match.scheduled_at)} · {formatClock(match.scheduled_at)}
              </p>
            </div>
            <Button asChild size="sm" variant="primary">
              <Link href={`/matches/${match.id}` as Route}>Responder</Link>
            </Button>
          </div>
        ) : item.kind === "match_reminder" && match ? (
          <p className="text-ink-900 text-sm">
            Mañana tienes partido contra <span className="font-semibold">{match.opponent}</span> a
            las <span className="font-mono">{formatClock(match.scheduled_at)}</span>.
          </p>
        ) : item.kind === "training_cancelled" ? (
          <p className="text-ink-900 text-sm">
            El entreno de hoy se canceló. {item.body ? `Motivo: ${item.body}` : null}
          </p>
        ) : item.body ? (
          <p className="text-ink-900 text-sm whitespace-pre-line">{item.body}</p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-ink-600 text-[11px]">{timeAgo(item.created_at)}</span>
          {item.href ? (
            <Link
              href={item.href as Route}
              className="text-brand-blue inline-flex items-center gap-0.5 text-xs font-semibold hover:underline focus-visible:underline focus-visible:outline-none"
            >
              Abrir
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  );
}
