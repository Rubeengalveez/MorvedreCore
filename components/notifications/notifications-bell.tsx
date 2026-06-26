"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils/cn";
import { timeAgo } from "@/lib/domain/calendar";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/actions/admin";
import type { NotificationItem } from "@/server/queries/notifications";

export interface NotificationsBellProps {
  initialUnread: number;
  initialNotifications: NotificationItem[];
  showFullListHref?: string;
}

const KIND_LABELS: Record<string, string> = {
  convocatoria: "Convocatoria",
  match_reminder: "Recordatorio",
  training_cancelled: "Entreno cancelado",
  news_pinned: "Noticia",
  result_published: "Resultado",
  monthly_close: "Cierre mensual",
};

export function NotificationsBell({
  initialUnread,
  initialNotifications,
  showFullListHref,
}: NotificationsBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"unread" | "all">("unread");
  const [items, setItems] = useState<NotificationItem[]>(initialNotifications);
  const [unread, setUnread] = useState<number>(initialUnread);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (tab === "unread") {
      return items.filter((n) => n.read_at == null);
    }
    return items;
  }, [items, tab]);

  function handleClickItem(n: NotificationItem) {
    if (n.read_at == null) {
      setItems((prev) =>
        prev.map((it) => (it.id === n.id ? { ...it, read_at: new Date().toISOString() } : it)),
      );
      setUnread((u) => Math.max(0, u - 1));
      startTransition(async () => {
        try {
          await markNotificationRead(n.id);
          router.refresh();
        } catch {
          // best-effort
        }
      });
    }
    if (n.href) {
      setOpen(false);
      router.push(n.href as Parameters<typeof router.push>[0]);
    }
  }

  function handleMarkAll() {
    setItems((prev) =>
      prev.map((it) => (it.read_at == null ? { ...it, read_at: new Date().toISOString() } : it)),
    );
    setUnread(0);
    startTransition(async () => {
      try {
        await markAllNotificationsRead();
        router.refresh();
      } catch {
        // best-effort
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Notificaciones"
          className="relative flex h-12 w-12 items-center justify-center rounded-full text-ink-600 transition-colors hover:bg-brand-foam active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unread > 0 ? (
            <span
              aria-hidden="true"
              className="absolute right-1 top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-action px-1 text-[10px] font-bold text-paper"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </button>
      </SheetTrigger>
      <SheetContent size="lg" className="gap-0">
        <SheetHeader className="flex-row items-center justify-between">
          <div>
            <SheetTitle>Notificaciones</SheetTitle>
            <SheetDescription>
              {unread > 0
                ? `${unread} sin leer`
                : "Estás al día con todo."}
            </SheetDescription>
          </div>
        </SheetHeader>
        <div className="flex gap-2 border-b border-ink-300 px-5">
          <TabButton
            label="No leídas"
            active={tab === "unread"}
            count={unread}
            onClick={() => setTab("unread")}
          />
          <TabButton
            label="Todas"
            active={tab === "all"}
            count={items.length}
            onClick={() => setTab("all")}
          />
        </div>
        <SheetBody>
          {filtered.length === 0 ? (
            <p className="text-sm text-ink-600">
              {tab === "unread"
                ? "No tienes notificaciones sin leer."
                : "Aún no tienes notificaciones."}
            </p>
          ) : (
            <ul className="flex flex-col gap-2 pb-[env(safe-area-inset-bottom)]">
              {filtered.map((n) => (
                <li key={n.id}>
                  <NotificationRow
                    notification={n}
                    onClick={() => handleClickItem(n)}
                  />
                </li>
              ))}
            </ul>
          )}
        </SheetBody>
        <SheetFooter className="flex-row items-center justify-between gap-2">
          {showFullListHref ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                router.push(showFullListHref as Parameters<typeof router.push>[0]);
              }}
            >
              Ver todas
            </Button>
          ) : (
            <span />
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={handleMarkAll}
            disabled={pending || unread === 0}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-4 w-4" aria-hidden="true" />
            )}
            Marcar todas como leídas
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function TabButton({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative inline-flex h-12 items-center gap-2 px-1 font-display text-sm font-semibold transition-colors focus-visible:outline-none",
        active ? "text-brand-blue" : "text-ink-600 hover:text-brand-deep",
      )}
    >
      {label}
      <span
        className={cn(
          "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
          active ? "bg-brand-blue text-paper" : "bg-ink-300/40 text-ink-900",
        )}
      >
        {count}
      </span>
      {active ? (
        <span
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-brand-blue"
        />
      ) : null}
    </button>
  );
}

function NotificationRow({
  notification,
  onClick,
}: {
  notification: NotificationItem;
  onClick: () => void;
}) {
  const isUnread = notification.read_at == null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors hover:bg-brand-foam focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
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
      <div className="flex flex-1 flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-sm font-bold text-brand-deep">
            {notification.title}
          </span>
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-ink-600">
            {KIND_LABELS[notification.kind] ?? notification.kind}
          </span>
        </div>
        {notification.body ? (
          <p className="line-clamp-2 text-xs text-ink-600">{notification.body}</p>
        ) : null}
        <span className="text-[10px] text-ink-600">
          {timeAgo(notification.created_at)}
        </span>
      </div>
    </button>
  );
}
