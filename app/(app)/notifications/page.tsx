import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { Bell, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
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

const KIND_LABELS: Record<string, string> = {
  convocatoria: "Convocatoria",
  match_reminder: "Recordatorio",
  training_cancelled: "Entreno cancelado",
  news_pinned: "Noticia",
  result_published: "Resultado",
  monthly_close: "Cierre mensual",
};

export default async function NotificationsPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");

  const [items, unread] = await Promise.all([
    getNotificationsForProfile(ctx.activeProfile.id, 100).catch(
      () => [] as NotificationItem[],
    ),
    getUnreadNotificationsCount(ctx.activeProfile.id).catch(() => 0),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4">
      <header className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-[28px] font-extrabold leading-[1.1] tracking-tight text-brand-deep">
            Notificaciones
          </h1>
          <p className="text-sm text-ink-600">
            {unread > 0
              ? `${unread} sin leer de ${items.length} totales.`
              : "Estás al día con todo."}
          </p>
        </div>
        <Bell className="hidden h-7 w-7 text-brand-deep sm:block" />
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-ink-300 bg-paper p-8 text-center">
          <Check className="h-10 w-10 text-success" />
          <p className="text-sm text-ink-600">
            Sin novedades. Cuando convoquen a un jugador o cancelen un entreno,
            aparecerá aquí.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((n) => (
            <NotificationRow key={n.id} item={n} />
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

function NotificationRow({ item }: { item: NotificationItem }) {
  const isUnread = item.read_at == null;
  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-md border p-4",
        isUnread
          ? "border-brand-aqua/40 bg-brand-foam"
          : "border-ink-300 bg-paper",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-1 block h-2 w-2 shrink-0 rounded-full",
          isUnread ? "bg-brand-blue" : "bg-ink-300",
        )}
      />
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-display text-base font-bold text-brand-deep">
            {item.title}
          </span>
          <span className="rounded-full border border-ink-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-600">
            {KIND_LABELS[item.kind] ?? item.kind}
          </span>
        </div>
        {item.body ? (
          <p className="whitespace-pre-line text-sm text-ink-600">{item.body}</p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-ink-600">
            {timeAgo(item.created_at)}
          </span>
          {item.href ? (
            <Link
              href={item.href as Route}
              className="text-xs font-semibold text-brand-blue hover:underline focus-visible:underline focus-visible:outline-none"
            >
              Abrir
            </Link>
          ) : null}
        </div>
      </div>
    </li>
  );
}
