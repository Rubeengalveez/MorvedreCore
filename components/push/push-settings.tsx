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
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const ok = Boolean(
      publicKey &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window,
    );
    queueMicrotask(() => setSupported(ok));
    if (!ok) return;
    let cancelled = false;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then(async (subscription) =>
        subscription ? await getPushSubscriptionEnabled(subscription.endpoint) : false,
      )
      .then((active) => {
        if (!cancelled) setEnabled(active);
      })
      .catch(() => {
        if (!cancelled)
          setError("No pudimos comprobar los avisos. Pulsa Activar para volver a intentarlo.");
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  if (!supported) {
    return (
      <section className="border-ink-300 bg-paper-card text-ink-600 rounded-md border p-3 text-sm font-semibold">
        Este navegador no permite push web en este modo. Los avisos seguiran dentro de la app.
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
        if (permission !== "granted") throw new Error("Permiso de notificaciones denegado.");
        const registration = await navigator.serviceWorker.ready;
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
        if (!response.ok) throw new Error("No pudimos guardar esta suscripcion.");
        setEnabled(true);
        setMessage("Push activado en este dispositivo.");
      } catch (err) {
        if (createdSubscription) {
          await createdSubscription.unsubscribe().catch(() => false);
        }
        setError(err instanceof Error ? err.message : "No pudimos activar push.");
      }
    });
  }

  function disable() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
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
        setMessage("Push desactivado en este dispositivo.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pudimos desactivar push.");
      }
    });
  }

  function test() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/push/test", { method: "POST" });
        if (!response.ok) throw new Error("No pudimos enviar la prueba.");
        setMessage("Prueba enviada.");
      } catch {
        setError("No pudimos enviar la prueba. Comprueba tu conexión y vuelve a intentarlo.");
      }
    });
  }

  return (
    <section className="border-ink-300 bg-paper-card shadow-elev-1 flex flex-col gap-2 rounded-md border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-pool-deep text-sm font-extrabold">Push en este dispositivo</p>
          <p className="text-ink-600 text-xs font-semibold">
            {checking
              ? "Comprobando los avisos de esta cuenta…"
              : enabled
                ? "Activo para esta cuenta."
                : "Recibe avisos aunque no tengas la app abierta."}
          </p>
        </div>
        {enabled ? (
          <BellRing className="text-success h-5 w-5 shrink-0" />
        ) : (
          <BellOff className="text-ink-500 h-5 w-5 shrink-0" />
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={pending || checking}
          onClick={enabled ? disable : enable}
          className="bg-pool-deep text-paper focus-visible:ring-pool-blue h-12 touch-manipulation rounded-md px-3 text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
        >
          {enabled ? "Desactivar" : "Activar"}
        </button>
        <button
          type="button"
          disabled={pending || checking || !enabled}
          onClick={test}
          className="border-ink-300 bg-paper text-pool-deep focus-visible:ring-pool-blue h-12 touch-manipulation rounded-md border px-3 text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
        >
          Probar
        </button>
      </div>
      {message ? (
        <p role="status" className="text-success text-xs font-bold">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-goggle-red text-xs font-bold">
          {error}
        </p>
      ) : null}
    </section>
  );
}
