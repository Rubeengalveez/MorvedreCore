"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/server/actions/auth";
import { clearLocalMatches } from "@/lib/pwa/live-match-store";

export function SignOutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        try { await clearLocalMatches(); } catch (caught) {
          setError(caught instanceof Error ? caught.message : "No pudimos comprobar las actas pendientes.");
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
        router.refresh();
      } catch {
        setError("No pudimos cerrar la sesión. Comprueba tu conexión y vuelve a intentarlo.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="danger"
        size="md"
        className="w-full"
        disabled={pending}
        onClick={submit}
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {pending ? "Cerrando sesión…" : "Cerrar sesión"}
      </Button>
      {error ? (
        <p role="alert" className="text-goggle-red text-sm font-semibold">
          {error}
        </p>
      ) : null}
    </div>
  );
}
