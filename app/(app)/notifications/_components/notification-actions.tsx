"use client";

import { CheckCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/actions/admin/notifications";

export function NotificationCardAction({
  id,
  href,
  className,
  children,
}: {
  id: string;
  href: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await markNotificationRead(id);
          if (href) router.push(href as never);
          else router.refresh();
        });
      }}
      className={cn(
        "focus-visible:ring-pool-blue w-full touch-manipulation text-left transition-[border-color,background-color,box-shadow,transform,opacity] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.995] disabled:opacity-70 motion-reduce:transition-none",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function MarkAllNotificationsButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={disabled || pending}
      aria-label="Marcar todas las notificaciones como leídas"
      className="w-full min-[420px]:w-auto"
      onClick={() => {
        startTransition(async () => {
          await markAllNotificationsRead();
          router.refresh();
        });
      }}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <CheckCheck className="h-4 w-4" aria-hidden="true" />
      )}
      Marcar todo leído
    </Button>
  );
}
