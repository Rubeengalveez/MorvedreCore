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
  UserCheck,
  UserX,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { PushSettings } from "@/components/push/push-settings";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/domain/calendar";
import { cn } from "@/lib/utils/cn";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import {
  getNotificationsForProfile,
  getUnreadNotificationsCount,
  type NotificationItem,
} from "@/server/queries/notifications";
import {
  MarkAllNotificationsButton,
  NotificationCardAction,
} from "./_components/notification-actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Notificaciones — Morvedre Core",
  description: "Tus avisos y notificaciones del club.",
};

const CLOCK_FORMATTER = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
});
const DAY_FORMATTER = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "short",
});
const NOTIFICATIONS_PER_PAGE = 20;

const KIND_META: Record<
  string,
  { label: string; Icon: typeof Calendar; color: string; tone: string }
> = {
  convocatoria: {
    label: "Convocatoria",
    Icon: Trophy,
    color: "var(--action)",
    tone: "border-brand-action/30 bg-brand-action/5",
  },
  match_reminder: {
    label: "Recordatorio",
    Icon: Calendar,
    color: "var(--pool-blue)",
    tone: "border-pool-blue/30 bg-pool-blue/5",
  },
  training_cancelled: {
    label: "Entreno cancelado",
    Icon: XCircle,
    color: "var(--danger)",
    tone: "border-danger/30 bg-danger/5",
  },
  training_absence: {
    label: "Ausencia",
    Icon: UserX,
    color: "var(--danger)",
    tone: "border-danger/30 bg-danger/5",
  },
  training_attendance_corrected: {
    label: "Corrección",
    Icon: UserCheck,
    color: "var(--success)",
    tone: "border-success/30 bg-success/5",
  },
  news_pinned: {
    label: "Noticia",
    Icon: Megaphone,
    color: "var(--pool-teal)",
    tone: "border-pool-teal/30 bg-pool-teal/5",
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
        team_color: teamObj?.color ?? "var(--pool-blue)",
      });
    }
  }

  const profileIds = Array.from(
    new Set(
      items
        .flatMap((item) => [item.recipient_id, item.related_profile_id])
        .filter((value): value is string => value != null),
    ),
  );
  if (profileIds.length > 0) {
    const { data } = await supabase.from("profiles").select("id, photo_url").in("id", profileIds);
    for (const p of (data ?? []) as Array<{ id: string; photo_url: string | null }>) {
      photoByProfile.set(p.id, p.photo_url);
    }
  }

  return { matchById, photoByProfile };
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string }>;
}) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");

  const params = await searchParams;
  const [items, unread] = await Promise.all([
    getNotificationsForProfile(ctx.activeProfile.id, 100).catch(() => [] as NotificationItem[]),
    getUnreadNotificationsCount(ctx.activeProfile.id).catch(() => 0),
  ]);

  const view = params.view === "unread" ? "unread" : "all";
  const visibleItems = view === "unread" ? items.filter((item) => item.read_at == null) : items;
  const totalPages = Math.max(1, Math.ceil(visibleItems.length / NOTIFICATIONS_PER_PAGE));
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Math.min(
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    totalPages,
  );
  const pageItems = visibleItems.slice(
    (page - 1) * NOTIFICATIONS_PER_PAGE,
    page * NOTIFICATIONS_PER_PAGE,
  );
  const { matchById, photoByProfile } = await loadContextForNotifications(pageItems);

  return (
    <PageShell width="md" className="gap-5 pb-8">
      <PageHeader
        eyebrow="Buzón"
        title="Notificaciones"
        description={`${unread > 0 ? `${unread} sin leer` : "Estás al día"} · ${items.length}${items.length === 100 ? "+" : ""} avisos recientes`}
        icon={<Bell className="h-5 w-5" aria-hidden="true" />}
        action={<MarkAllNotificationsButton disabled={unread === 0} />}
      />

      <PushSettings key={ctx.ownProfile.id} publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />

      <nav
        aria-label="Filtrar notificaciones"
        className="border-ink-200 bg-paper-card grid grid-cols-2 rounded-xl border p-1"
      >
        <Link
          href={"/notifications?view=all" as Route}
          aria-current={view === "all" ? "page" : undefined}
          className={cn(
            "focus-visible:ring-pool-blue flex min-h-12 touch-manipulation items-center justify-center rounded-xl text-sm font-extrabold transition-[background-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98] motion-reduce:transition-none",
            view === "all" ? "bg-pool-deep text-paper" : "text-ink-600",
          )}
        >
          Todas
        </Link>
        <Link
          href={"/notifications?view=unread" as Route}
          aria-current={view === "unread" ? "page" : undefined}
          className={cn(
            "focus-visible:ring-pool-blue flex min-h-12 touch-manipulation items-center justify-center rounded-xl text-sm font-extrabold transition-[background-color,color,transform] duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98] motion-reduce:transition-none",
            view === "unread" ? "bg-pool-deep text-paper" : "text-ink-600",
          )}
        >
          Sin leer ({unread})
        </Link>
      </nav>

      {visibleItems.length === 0 ? (
        <EmptyState
          icon={<Check className="h-6 w-6" aria-hidden="true" />}
          title="Estás al día"
          description="Las convocatorias, cancelaciones y avisos importantes aparecerán aquí."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {pageItems.map((n) => (
            <NotificationRow
              key={n.id}
              item={n}
              match={n.related_match_id ? (matchById.get(n.related_match_id) ?? null) : null}
              photoUrl={photoByProfile.get(n.related_profile_id ?? n.recipient_id) ?? null}
            />
          ))}
        </ul>
      )}

      {visibleItems.length > NOTIFICATIONS_PER_PAGE ? (
        <nav
          aria-label="Páginas de notificaciones"
          className="border-ink-200 bg-paper-card shadow-elev-1 flex items-center justify-between gap-3 rounded-xl border p-2"
        >
          {page > 1 ? (
            <Link
              href={`/notifications?view=${view}&page=${page - 1}` as Route}
              className="border-ink-300 text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue inline-flex min-h-12 touch-manipulation items-center gap-1 rounded-xl border px-3 text-sm font-extrabold transition-[background-color,transform] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97] motion-reduce:transition-none"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Anterior
            </Link>
          ) : (
            <span aria-hidden="true" className="w-[6.5rem]" />
          )}
          <span className="text-ink-700 text-center text-sm font-bold">
            Página <span className="text-pool-deep font-extrabold">{page}</span> de {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/notifications?view=${view}&page=${page + 1}` as Route}
              className="border-ink-300 text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue inline-flex min-h-12 touch-manipulation items-center gap-1 rounded-xl border px-3 text-sm font-extrabold transition-[background-color,transform] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97] motion-reduce:transition-none"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <span aria-hidden="true" className="w-[6.5rem]" />
          )}
        </nav>
      ) : null}
    </PageShell>
  );
}

function formatClock(iso: string): string {
  return CLOCK_FORMATTER.format(new Date(iso));
}

function formatDayShort(iso: string): string {
  const d = new Date(iso);
  return DAY_FORMATTER.format(d);
}

function getBadgeVariant(kind: string): "brand" | "danger" | "success" | "info" | "neutral" {
  if (kind === "convocatoria") return "brand";
  if (kind === "training_cancelled" || kind === "training_absence") return "danger";
  if (kind === "training_attendance_corrected" || kind === "result_published") return "success";
  if (kind === "news_pinned" || kind === "match_reminder") return "info";
  return "neutral";
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
    <li className="content-auto">
      <Card
        asChild
        accentColor={meta.color}
        className={cn("transition-shadow", isUnread ? "bg-pool-foam/20" : "bg-paper-card")}
      >
        <NotificationCardAction
          id={item.id}
          href={item.href}
          className="flex items-start gap-3 p-4"
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
              <span className="font-display text-pool-deep text-base font-bold">{item.title}</span>
              <StatusBadge variant={getBadgeVariant(item.kind)} size="sm">
                {meta.label}
              </StatusBadge>
            </div>
            {item.kind === "convocatoria" && match ? (
              <div
                className="border-ink-300 bg-paper flex items-center gap-2 rounded-xl border p-2"
                style={{ borderLeftWidth: "3px", borderLeftColor: match.team_color }}
              >
                <Avatar src={photoUrl} name={item.title} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="text-pool-deep line-clamp-1 text-sm font-semibold">
                    vs {match.opponent}
                  </p>
                  <p className="text-ink-600 text-sm font-semibold">
                    {formatDayShort(match.scheduled_at)} · {formatClock(match.scheduled_at)}
                  </p>
                </div>
                <span className="bg-pool-blue text-paper inline-flex min-h-12 items-center rounded-xl px-3 text-sm font-extrabold">
                  Responder
                </span>
              </div>
            ) : item.kind === "match_reminder" && match ? (
              <p className="text-ink-900 text-sm">
                Mañana tienes partido contra <span className="font-semibold">{match.opponent}</span>{" "}
                a las <span className="font-mono">{formatClock(match.scheduled_at)}</span>.
              </p>
            ) : item.kind === "training_cancelled" ? (
              <p className="text-ink-900 text-sm">
                El entreno de hoy se canceló. {item.body ? `Motivo: ${item.body}` : null}
              </p>
            ) : item.body ? (
              <p className="text-ink-900 text-sm whitespace-pre-line">{item.body}</p>
            ) : null}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-ink-600 text-sm">{timeAgo(item.created_at)}</span>
              {item.href ? (
                <span className="text-pool-blue inline-flex items-center gap-0.5 text-xs font-semibold">
                  Abrir
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              ) : null}
            </div>
          </div>
        </NotificationCardAction>
      </Card>
    </li>
  );
}
