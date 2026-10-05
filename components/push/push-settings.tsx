"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing, BellOff } from "lucide-react";
import { getPushSubscriptionEnabled } from "@/server/actions/push";

function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function PushSettings({ publicKey }: { publicKey: string | undefined }) {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const ok = Boolean(
      window.isSecureContext &&
      publicKey &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window,
    );
    queueMicrotask(() => {
      setSupported(ok);
      if (!ok) {
        setChecking(false);
        setUnavailable(
          !window.isSecureContext
            ? "Los avisos del móvil necesitan la versión publicada con conexión segura."
            : "Instala la app para recibir avisos con la app cerrada.",
        );
      }
    });
    if (!ok) return;
    let cancelled = false;
    const check = () =>
      navigator.serviceWorker
        .getRegistration()
        .then(async (registration) => {
          if (
            !registration?.active &&
            process.env.NODE_ENV === "production" &&
            navigator.serviceWorker.ready
          ) {
            let timer: ReturnType<typeof setTimeout> | undefined;
            try {
              registration = await Promise.race([
                navigator.serviceWorker.ready,
                new Promise<undefined>((resolve) => {
                  timer = setTimeout(() => resolve(undefined), 8000);
                }),
              ]);
            } finally {
              clearTimeout(timer);
            }
          }
          if (registration?.pushManager && !cancelled) setUnavailable(null);
          if (!registration?.pushManager && !cancelled)
            setUnavailable(
              process.env.NODE_ENV === "development"
                ? "Los avisos del móvil se podrán activar en la versión publicada de Core."
                : "Instala la app y vuelve a abrirla para activar los avisos.",
            );
          return registration?.pushManager?.getSubscription() ?? null;
        })
        .then(async (subscription) =>
          subscription ? await getPushSubscriptionEnabled(subscription.endpoint) : false,
        )
        .then((active) => {
          if (!cancelled) setEnabled(active && Notification.permission === "granted");
        })
        .catch(() => {
          if (!cancelled)
            setError("No pudimos comprobar los avisos. Pulsa Activar para volver a intentarlo.");
        })
        .finally(() => {
          if (!cancelled) setChecking(false);
        });
    void check();
    const recheck = () => {
      if (document.visibilityState === "visible") void check();
    };
    window.addEventListener("focus", recheck);
    navigator.serviceWorker.addEventListener?.("controllerchange", recheck);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", recheck);
      navigator.serviceWorker.removeEventListener?.("controllerchange", recheck);
    };
  }, [publicKey]);

  if (!supported || unavailable) {
    return (
      <section className="border-pool-deep/65 text-pool-deep rounded-2xl border-2 bg-blue-50 p-4 text-base font-semibold">
        <h2 className="text-lg font-extrabold">Notificaciones en el móvil</h2>
        <p className="mt-2" role="status">
          {checking
            ? "Comprobando las notificaciones…"
            : (unavailable ?? "Instala la app para recibir avisos con la app cerrada.")}
        </p>
      </section>
    );
  }

  function enable() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      let createdSubscription: PushSubscription | null = null;
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted")
          throw new Error(
            "Activa las notificaciones de Morvedre Core en los ajustes del móvil y vuelve a intentarlo.",
          );
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration?.pushManager)
          throw new Error("Abre la app instalada y vuelve a intentarlo.");
        const previous = await registration.pushManager.getSubscription();
        const previousEnabled = previous
          ? await getPushSubscriptionEnabled(previous.endpoint)
          : false;
        if (previous && !previousEnabled) {
          const removed = await previous.unsubscribe();
          if (!removed && (await registration.pushManager.getSubscription())) {
            throw new Error(
              "No pudimos renovar los avisos de este dispositivo. Vuelve a intentarlo.",
            );
          }
        }
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey!),
        });
        if (!previousEnabled) createdSubscription = subscription;
        const response = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });
        if (!response.ok) throw new Error("No pudimos activar los avisos. Comprueba tu conexión.");
        setEnabled(true);
        setMessage("Avisos activados en este dispositivo.");
      } catch (err) {
        if (createdSubscription) {
          await createdSubscription.unsubscribe().catch(() => false);
        }
        setError(err instanceof Error ? err.message : "No pudimos activar los avisos.");
      }
    });
  }

  function disable() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration?.pushManager)
          throw new Error("Abre la app instalada y vuelve a intentarlo.");
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          const response = await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          if (!response.ok)
            throw new Error("No pudimos desactivar los avisos. Vuelve a intentarlo.");
          const unsubscribed = await subscription.unsubscribe();
          if (!unsubscribed && (await registration.pushManager.getSubscription())) {
            throw new Error(
              "Los avisos se han detenido, pero el navegador no ha cancelado la suscripción. Vuelve a intentarlo.",
            );
          }
        }
        setEnabled(false);
        setMessage("Avisos desactivados en este dispositivo.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pudimos desactivar los avisos.");
      }
    });
  }

  function test() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const subscription = await (
          await navigator.serviceWorker.getRegistration()
        )?.pushManager.getSubscription();
        if (!subscription) throw new Error("Activa los avisos antes de probarlos.");
        const response = await fetch("/api/push/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        const result = await response.json();
        if (!response.ok || result.success !== true)
          throw new Error("No pudimos enviar la prueba.");
        setMessage("Prueba enviada a este dispositivo. Comprueba las notificaciones del móvil.");
      } catch {
        setError("No pudimos enviar la prueba. Comprueba tu conexión y vuelve a intentarlo.");
      }
    });
  }

  return (
    <section className="border-pool-deep/70 bg-paper-card flex flex-col gap-3 rounded-2xl border-2 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-pool-deep text-lg font-extrabold">Notificaciones en el móvil</h2>
          <p className="text-pool-deep mt-1 text-base font-medium">
            {checking
              ? "Comprobando los avisos de esta cuenta…"
              : enabled
                ? "Activo para esta cuenta."
                : "Recibe avisos aunque no tengas la app abierta."}
          </p>
        </div>
        {enabled ? (
          <BellRing className="h-5 w-5 shrink-0 text-green-800" />
        ) : (
          <BellOff className="h-5 w-5 shrink-0 text-slate-700" />
        )}
      </div>
      <div className="grid gap-2">
        <button
          type="button"
          disabled={pending || checking}
          onClick={enabled ? disable : enable}
          className="bg-pool-deep text-paper focus-visible:ring-pool-blue min-h-12 touch-manipulation rounded-xl px-3 text-base font-extrabold focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
        >
          {pending ? "Un momento…" : enabled ? "Desactivar avisos" : "Activar avisos"}
        </button>
        <button
          type="button"
          disabled={pending || checking || !enabled}
          onClick={test}
          className="border-pool-deep text-pool-deep focus-visible:ring-pool-blue min-h-12 touch-manipulation rounded-xl border-2 bg-blue-50 px-3 text-base font-extrabold focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
        >
          Probar avisos
        </button>
      </div>
      {message ? (
        <p role="status" className="text-base font-bold text-green-800">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-base font-bold text-red-800">
          {error}
        </p>
      ) : null}
    </section>
  );
}
