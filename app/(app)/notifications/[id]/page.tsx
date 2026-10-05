import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Bell } from "lucide-react";
import { PageShell } from "@/components/ui/page-shell";
import { PageBackLink } from "@/components/ui/page-back-link";
import { shopPrimary } from "@/components/shop/shop-ui";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getNotificationForProfile } from "@/server/queries/notifications";
import { notificationPresentation, notificationTargetLabel } from "@/lib/domain/notifications";
import { NotificationReadOnOpen } from "../_components/notification-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aviso — Morvedre Core" };
export default async function NotificationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; view?: string; page?: string }>;
}) {
  const [ctx, { id }, origin] = await Promise.all([
    getActiveProfileContext(),
    params,
    searchParams,
  ]);
  if (!ctx?.ownProfile.is_active) redirect("/login");
  if (!z.uuid().safeParse(id).success) notFound();
  const item = await getNotificationForProfile(ctx.ownProfile.id, id);
  if (!item) notFound();
  const query = new URLSearchParams({
    view: origin.view === "unread" ? "unread" : "all",
    page: /^\d{1,6}$/.test(origin.page ?? "") ? origin.page! : "1",
  });
  if (origin.from === "profile") query.set("from", "profile");
  const meta = notificationPresentation(item.kind, item.href);
  const target = item.href ? new URL(item.href, "https://morvedre.invalid") : null;
  if (target) {
    target.searchParams.set("from", "notification");
    target.searchParams.set("notificationId", id);
  }
  return (
    <PageShell width="md" className="gap-3 pb-5">
      <PageBackLink href={`/notifications?${query}` as Route}>Notificaciones</PageBackLink>
      <h1 className="text-pool-deep text-3xl font-extrabold">Tu aviso</h1>
      <article className="border-pool-deep/70 overflow-hidden rounded-2xl border-2 bg-white">
        <div className="bg-pool-deep flex items-center gap-3 p-4 text-white">
          <Bell aria-hidden="true" className="h-6 w-6 shrink-0" />
          <span className="font-extrabold">{meta.label}</span>
        </div>
        <div className="text-pool-deep flex flex-col gap-4 p-5">
          <time dateTime={item.created_at} className="block text-sm font-semibold">
            {new Intl.DateTimeFormat("es-ES", {
              dateStyle: "long",
              timeStyle: "short",
              timeZone: "Europe/Madrid",
            }).format(new Date(item.created_at))}
          </time>
          <h2 className="text-xl leading-snug font-extrabold">{item.title}</h2>
          {item.body && (
            <p className="text-base leading-relaxed font-medium whitespace-pre-line">{item.body}</p>
          )}
          {target && (
            <Link
              href={`${target.pathname}${target.search}` as Route}
              className={`${shopPrimary} w-full`}
            >
              {notificationTargetLabel(item.href!)}
            </Link>
          )}
        </div>
      </article>
      <NotificationReadOnOpen id={id} unread={!item.read_at} />
    </PageShell>
  );
}
