"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing, BellOff } from "lucide-react";

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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const ok = Boolean(
      publicKey && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window,
    );
    queueMicrotask(() => setSupported(ok));
    if (!ok) return;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setEnabled(Boolean(subscription)))
      .catch(() => setEnabled(false));
  }, [publicKey]);

  if (!supported) {
    return (
      <section className="border-ink-300 bg-paper-card rounded-md border p-3 text-sm font-semibold text-ink-600">
        Este navegador no permite push web en este modo. Los avisos seguiran dentro de la app.
      </section>
    );
  }

  function enable() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") throw new Error("Permiso de notificaciones denegado.");
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey!),
        });
        const response = await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });
        if (!response.ok) throw new Error("No pudimos guardar esta suscripcion.");
        setEnabled(true);
        setMessage("Push activado en este dispositivo.");
      } catch (err) {
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
          await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });
          await subscription.unsubscribe();
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
      const response = await fetch("/api/push/test", { method: "POST" });
      if (!response.ok) {
        setError("No pudimos enviar la prueba.");
        return;
      }
      setMessage("Prueba enviada.");
    });
  }

  return (
    <section className="border-ink-300 bg-paper-card flex flex-col gap-2 rounded-md border p-3 shadow-elev-1">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-pool-deep">Push en este dispositivo</p>
          <p className="text-xs font-semibold text-ink-600">
            {enabled ? "Activo para esta cuenta." : "Recibe avisos aunque no tengas la app abierta."}
          </p>
        </div>
        {enabled ? (
          <BellRing className="h-5 w-5 shrink-0 text-success" />
        ) : (
          <BellOff className="h-5 w-5 shrink-0 text-ink-500" />
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={enabled ? disable : enable}
          className="bg-pool-deep text-paper h-11 rounded-md px-3 text-sm font-extrabold disabled:opacity-60"
        >
          {enabled ? "Desactivar" : "Activar"}
        </button>
        <button
          type="button"
          disabled={pending || !enabled}
          onClick={test}
          className="border-ink-300 bg-paper text-pool-deep h-11 rounded-md border px-3 text-sm font-extrabold disabled:opacity-60"
        >
          Probar
        </button>
      </div>
      {message ? <p className="text-xs font-bold text-success">{message}</p> : null}
      {error ? <p className="text-xs font-bold text-goggle-red">{error}</p> : null}
    </section>
  );
}
