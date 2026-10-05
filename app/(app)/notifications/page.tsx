import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { PageShell } from "@/components/ui/page-shell";
import { PageBackLink } from "@/components/ui/page-back-link";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getRenderAdminAccess } from "@/server/actions/admin/_helpers";
import {
  getNotificationInbox,
  getNotificationPreferences,
  getUnreadNotificationsCount,
} from "@/server/queries/notifications";
import { notificationPresentation } from "@/lib/domain/notifications";
import { timeAgo } from "@/lib/domain/calendar";
import { NotificationPreferencesButton } from "./_components/notification-preferences";
import { MarkAllNotificationsButton } from "./_components/notification-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notificaciones — Morvedre Core" };

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; page?: string; from?: string }>;
}) {
  const [ctx, params, access] = await Promise.all([
    getActiveProfileContext(),
    searchParams,
    getRenderAdminAccess(),
  ]);
  if (!ctx?.ownProfile.is_active) redirect("/login");
  const view = params.view === "all" ? "all" : "unread";
  const requestedPage = /^\d{1,6}$/.test(params.page ?? "") ? Math.max(1, Number(params.page)) : 1;
  const [inbox, unread, preferences] = await Promise.all([
    getNotificationInbox(ctx.ownProfile.id, view, requestedPage),
    getUnreadNotificationsCount(ctx.ownProfile.id),
    getNotificationPreferences(ctx.ownProfile.id),
  ]);
  const origin = params.from === "profile" ? "&from=profile" : "";
  const path = (nextView: string, page = 1) =>
    `/notifications?view=${nextView}&page=${page}${origin}`;
  return (
    <PageShell width="md" className="gap-3 pb-5">
      <PageBackLink href={origin ? "/profile" : "/dashboard"}>
        {origin ? "Mi perfil" : "Inicio"}
      </PageBackLink>
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-pool-deep text-2xl font-extrabold">Notificaciones</h1>
        <NotificationPreferencesButton
          initial={preferences}
          admin={access.isAdmin}
          publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}
        />
      </div>
      <nav aria-label="Ver notificaciones" className="grid grid-cols-2 gap-2">
        {[
          { id: "unread", label: "Sin leer", count: unread },
          { id: "all", label: "Todas", count: view === "all" ? inbox.total : null },
        ].map((tab) => (
          <Link
            key={tab.id}
            href={path(tab.id) as Route}
            replace
            aria-current={view === tab.id ? "page" : undefined}
            className={`border-pool-deep/70 focus-visible:outline-pool-blue flex min-h-14 min-w-0 items-center justify-center gap-2 rounded-xl border-2 px-3 font-extrabold focus-visible:outline-2 focus-visible:outline-offset-2 ${view === tab.id ? "bg-pool-deep text-white" : "text-pool-deep bg-white"}`}
          >
            <span className="whitespace-nowrap">{tab.label}</span>
            {tab.count !== null && (
              <span
                className={`shrink-0 rounded-md px-2 py-1 text-sm tabular-nums ${view === tab.id ? "bg-white/15" : "bg-blue-100"}`}
              >
                {tab.count}
              </span>
            )}
          </Link>
        ))}
      </nav>
      {unread > 0 && <MarkAllNotificationsButton />}
      {inbox.items.length ? (
        <ol className="flex flex-col gap-2.5">
          {inbox.items.map((item) => {
            const meta = notificationPresentation(item.kind, item.href);
            return (
              <li key={item.id}>
                <Link
                  href={
                    `/notifications/${item.id}?view=${view}&page=${inbox.page}${origin}` as Route
                  }
                  className={`border-pool-deep/65 text-pool-deep focus-visible:outline-pool-blue block rounded-2xl border-2 p-4 focus-visible:outline-2 focus-visible:outline-offset-2 active:bg-blue-100 ${item.read_at ? "bg-white" : "bg-blue-50"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`rounded-md border px-2 py-1 text-sm font-bold ${meta.attention ? "border-red-800 bg-red-50 text-red-900" : "border-pool-deep/65 bg-white"}`}
                    >
                      {meta.label}
                    </span>
                    {!item.read_at && (
                      <span className="text-pool-blue flex shrink-0 items-center gap-1.5 text-sm font-bold">
                        <span aria-hidden="true" className="bg-pool-blue h-2 w-2 rounded-full" />
                        Sin leer
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 text-lg leading-snug font-extrabold">{item.title}</h2>
                  {item.body && (
                    <p className="mt-1 line-clamp-2 text-base leading-snug font-medium">
                      {item.body}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm font-semibold">
                    <time dateTime={item.created_at}>{timeAgo(item.created_at)}</time>
                    <span className="text-pool-blue inline-flex items-center gap-1">
                      Ver aviso <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : (
        <section className="border-pool-deep/65 text-pool-deep rounded-2xl border-2 bg-white p-6 text-center">
          <Bell className="text-pool-blue mx-auto h-9 w-9" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-extrabold">
            {view === "unread" ? "Estás al día" : "Todavía no hay avisos"}
          </h2>
          <p className="mt-2 font-medium">
            {view === "unread"
              ? "No tienes notificaciones sin leer."
              : "Los avisos del club aparecerán aquí."}
          </p>
          {view === "unread" && (
            <Link
              href={path("all") as Route}
              className="border-pool-deep/65 mt-4 inline-flex min-h-12 items-center justify-center rounded-xl border-2 bg-blue-50 px-4 font-bold"
            >
              Ver todas
            </Link>
          )}
        </section>
      )}
      {inbox.pages > 1 && (
        <nav
          aria-label="Páginas de notificaciones"
          className="flex items-center justify-between gap-2"
        >
          {inbox.page > 1 ? (
            <Link
              href={path(view, inbox.page - 1) as Route}
              className="border-pool-deep/65 text-pool-deep inline-flex min-h-12 items-center gap-1 rounded-xl border-2 bg-white px-3 font-bold"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-pool-deep font-bold tabular-nums">
            {inbox.page} / {inbox.pages}
          </span>
          {inbox.page < inbox.pages ? (
            <Link
              href={path(view, inbox.page + 1) as Route}
              className="border-pool-deep/65 text-pool-deep inline-flex min-h-12 items-center gap-1 rounded-xl border-2 bg-white px-3 font-bold"
            >
              Siguiente
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </PageShell>
  );
}
