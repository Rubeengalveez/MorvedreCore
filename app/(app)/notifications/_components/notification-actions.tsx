"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/actions/admin/notifications";

export function MarkAllNotificationsButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-pool-deep/65 text-pool-deep inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 bg-white px-3 font-bold"
      >
        <CheckCheck className="h-5 w-5" aria-hidden="true" />
        Marcar todas como leídas
      </button>
      <ActaGuardSheet
        open={open}
        onOpenChange={setOpen}
        context="NOTIFICACIONES"
        title="¿Marcar todos los avisos como leídos?"
        summary="Se conservarán en Todas."
        description="También se marcarán los avisos de otras páginas del buzón."
        icon="saved"
        pending={pending}
        error={error}
        actions={[
          {
            label: "Marcar como leídas",
            tone: "primary",
            onClick: () =>
              startTransition(async () => {
                try {
                  await markAllNotificationsRead();
                  setOpen(false);
                  router.refresh();
                } catch {
                  setError("No pudimos guardar el cambio. Vuelve a intentarlo.");
                }
              }),
          },
          { label: "Volver", tone: "secondary", onClick: () => setOpen(false) },
        ]}
      />
    </>
  );
}

export function NotificationReadOnOpen({ id, unread }: { id: string; unread: boolean }) {
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const attempted = useRef(false);
  const router = useRouter();
  const mark = () =>
    startTransition(async () => {
      try {
        await markNotificationRead(id);
        setError(false);
        router.refresh();
      } catch {
        setError(true);
      }
    });
  useEffect(() => {
    if (!unread || attempted.current) return;
    attempted.current = true;
    startTransition(async () => {
      try {
        await markNotificationRead(id);
        router.refresh();
      } catch {
        setError(true);
      }
    });
  }, [id, unread, router]);
  return error ? (
    <div
      role="alert"
      className="rounded-xl border-2 border-red-800 bg-red-50 p-3 font-semibold text-red-900"
    >
      <p>No pudimos marcar este aviso como leído.</p>
      <button
        type="button"
        onClick={mark}
        disabled={pending}
        className="mt-2 min-h-12 rounded-xl border-2 border-red-800 bg-white px-3 font-bold"
      >
        {pending ? "Guardando…" : "Volver a intentar"}
      </button>
    </div>
  ) : null;
}
