"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";
import { getUnreadCount } from "@/server/actions/admin/notifications";
import { MdNotifications } from "react-icons/md";

import { cn } from "@/lib/utils/cn";
import type { NotificationItem } from "@/server/queries/notifications";

export interface NotificationsBellProps {
  initialUnread: number;
  initialNotifications: NotificationItem[];
  showFullListHref?: string;
  triggerClassName?: string;
}

export function NotificationsBell({
  initialUnread,
  showFullListHref = "/notifications",
  triggerClassName,
}: NotificationsBellProps) {
  const [unread, setUnread] = useState(initialUnread);
  useEffect(() => {
    let cancelled = false;
    const updateBadge = (count: number) => {
      const app = navigator as Navigator & {
        setAppBadge?: (count: number) => Promise<void>;
        clearAppBadge?: () => Promise<void>;
      };
      if (count) void app.setAppBadge?.(count).catch(() => undefined);
      else void app.clearAppBadge?.().catch(() => undefined);
    };
    queueMicrotask(() => {
      if (!cancelled) {
        setUnread(initialUnread);
        updateBadge(initialUnread);
      }
    });
    const check = async () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      try {
        const count = await getUnreadCount();
        if (!cancelled) {
          setUnread(count);
          updateBadge(count);
        }
      } catch {}
    };
    const timer = setInterval(check, 60000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [initialUnread]);
  return (
    <Link
      href={showFullListHref as Route}
      aria-label={unread > 0 ? `Notificaciones, ${unread} sin leer` : "Notificaciones"}
      className={cn(
        "relative flex h-12 w-12 touch-manipulation items-center justify-center rounded-xl text-current transition-[background-color,transform] duration-200 hover:bg-current/14 focus-visible:ring-2 focus-visible:ring-current/70 focus-visible:outline-none active:scale-[0.95] motion-reduce:transition-none",
        triggerClassName,
      )}
    >
      <MdNotifications className="h-6 w-6" aria-hidden="true" />
      {unread > 0 ? (
        <span
          aria-hidden="true"
          className="bg-action text-pool-deep absolute top-0 right-0 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-extrabold tabular-nums"
        >
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
