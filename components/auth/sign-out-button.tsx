"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { shopSecondary } from "@/components/shop/shop-ui";
import { signOut } from "@/server/actions/auth";
import { clearLocalMatches } from "@/lib/pwa/live-match-store";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        try {
          await clearLocalMatches();
        } catch (caught) {
          setError(
            caught instanceof Error ? caught.message : "No pudimos comprobar las actas pendientes.",
          );
          return;
        }
        let endpoint: string | undefined;
        let localPushRemoved = false;
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          const subscription = registration?.pushManager
            ? await registration.pushManager.getSubscription()
            : null;
          if (subscription) {
            endpoint = subscription.endpoint;
            localPushRemoved = await subscription.unsubscribe().catch(() => false);
            if (!localPushRemoved)
              localPushRemoved = !(await registration!.pushManager.getSubscription());
          }
          if (registration?.getNotifications) {
            const notifications = await registration.getNotifications().catch(() => []);
            notifications.forEach((notification) => notification.close());
          }
        }
        const result = await signOut({ endpoint, localPushRemoved });
        if (result.error) {
          setError(result.error);
          return;
        }
        router.replace("/login");
        void (navigator as Navigator & { clearAppBadge?: () => Promise<void> })
          .clearAppBadge?.()
          .catch(() => undefined);
        router.refresh();
      } catch {
        setError("No pudimos cerrar la sesión. Comprueba tu conexión y vuelve a intentarlo.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className={`${shopSecondary} w-full border-red-800 bg-red-50 text-red-900`}
        disabled={pending}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {pending ? "Cerrando sesión…" : "Cerrar sesión"}
      </button>
      <ActaGuardSheet
        open={open}
        onOpenChange={setOpen}
        context="Mi cuenta"
        title="¿Cerrar sesión?"
        icon="warning"
        summary="Saldrás de tu cuenta"
        description="Podrás volver a entrar con tu correo y contraseña o con Google."
        pending={pending}
        error={error}
        actions={[
          { label: "Seguir en la app", tone: "primary", onClick: () => setOpen(false) },
          { label: "Cerrar sesión", tone: "secondary", onClick: submit },
        ]}
      />
    </div>
  );
}
