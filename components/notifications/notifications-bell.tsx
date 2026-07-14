"use client";

import Link from "next/link";
import type { Route } from "next";
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
  return (
    <Link
      href={showFullListHref as Route}
      aria-label={
        initialUnread > 0 ? `Notificaciones, ${initialUnread} sin leer` : "Notificaciones"
      }
      className={cn(
        "relative flex h-11 w-11 touch-manipulation items-center justify-center rounded-xl text-current transition-[background-color,transform] duration-200 hover:bg-current/14 focus-visible:ring-2 focus-visible:ring-current/70 focus-visible:outline-none active:scale-[0.95] motion-reduce:transition-none",
        triggerClassName,
      )}
    >
      <MdNotifications className="h-6 w-6" aria-hidden="true" />
      {initialUnread > 0 ? (
        <span
          aria-hidden="true"
          className="bg-action text-paper absolute top-0.5 right-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-extrabold tabular-nums"
        >
          {initialUnread > 9 ? "9+" : initialUnread}
        </span>
      ) : null}
    </Link>
  );
}
