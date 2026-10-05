"use client";
import { useState, useTransition } from "react";
import { Settings2 } from "lucide-react";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import { PushSettings } from "@/components/push/push-settings";
import {
  NOTIFICATION_TOPICS,
  type NotificationPreferences,
  type NotificationTopic,
} from "@/lib/domain/notifications";
import { setNotificationPreference } from "@/server/actions/admin/notifications";

export function NotificationPreferencesButton({
  initial,
  admin,
  publicKey,
}: {
  initial: NotificationPreferences;
  admin: boolean;
  publicKey?: string;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function change(topic: NotificationTopic) {
    const enabled = !values[topic];
    setError(null);
    startTransition(async () => {
      try {
        await setNotificationPreference({ topic, enabled });
        setValues((current) => ({ ...current, [topic]: enabled }));
      } catch {
        setError("No pudimos guardar la preferencia. Vuelve a intentarlo.");
      }
    });
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Configurar notificaciones"
        className="border-pool-deep/65 text-pool-deep inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border-2 bg-white px-3 font-bold"
      >
        <Settings2 className="h-5 w-5" aria-hidden="true" />
        <span className="hidden min-[360px]:inline">Ajustes</span>
      </button>
      <ActaGuardSheet
        open={open}
        onOpenChange={setOpen}
        context="NOTIFICACIONES"
        title="Avisos en tu móvil"
        icon="saved"
        pending={pending}
        error={error}
        tall
        stickyActions
        body={
          <div className="flex flex-col gap-4">
            <PushSettings publicKey={publicKey} />
            <p className="text-pool-deep font-medium">
              Elige qué avisos recibir en el móvil. Todos se conservan en tu buzón.
            </p>
            {["Deporte", "Club", ...(admin ? ["Administración"] : [])].map((group) => (
              <section
                key={group}
                className="border-pool-deep/65 overflow-hidden rounded-xl border-2 bg-white"
              >
                <h3 className="bg-pool-deep px-3 py-2 text-base font-extrabold text-white">
                  {group}
                </h3>
                <div className="flex flex-col gap-2 p-2">
                  {NOTIFICATION_TOPICS.filter((topic) => topic.group === group).map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      role="switch"
                      aria-checked={values[topic.id]}
                      disabled={pending}
                      onClick={() => change(topic.id)}
                      className="border-pool-deep/65 text-pool-deep flex min-h-14 w-full items-center justify-between gap-3 rounded-lg border bg-blue-50/60 px-3 py-2 text-left font-bold disabled:opacity-60"
                    >
                      <span>{topic.label}</span>
                      <span
                        aria-hidden="true"
                        className={`border-pool-deep relative h-7 w-12 shrink-0 rounded-full border-2 ${values[topic.id] ? "bg-pool-blue" : "bg-slate-200"}`}
                      >
                        <span
                          className={`border-pool-deep absolute top-0.5 h-5 w-5 rounded-full border bg-white ${values[topic.id] ? "right-0.5" : "left-0.5"}`}
                        />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        }
        actions={[{ label: "Listo", tone: "primary", onClick: () => setOpen(false) }]}
      />
    </>
  );
}
