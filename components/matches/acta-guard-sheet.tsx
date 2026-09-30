"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CircleAlert, Loader2, ShieldCheck, X } from "lucide-react";

import styles from "@/components/matches/live-match.module.css";
import { useActaDialogFocus } from "./use-acta-dialog-focus";

interface ActaGuardAction {
  label: string;
  detail?: string;
  tone: "primary" | "secondary" | "subtle" | "danger";
  onClick: () => void | Promise<void>;
}

export interface ActaGuardSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: string;
  title: string;
  summary?: string;
  description?: string;
  body?: ReactNode;
  notice?: string;
  icon: "saved" | "warning";
  actions: ActaGuardAction[];
  pending?: boolean;
  error?: string | null;
  stickyActions?: boolean;
  scrollKey?: string | number;
  tall?: boolean;
}

const actionClasses = {
  primary: "border-pool-deep bg-pool-deep text-paper active:bg-ink-900",
  secondary: "border-pool-deep bg-paper-card text-pool-deep active:bg-pool-foam",
  subtle: "border-slate-500 bg-slate-100 text-pool-deep active:bg-slate-200",
  danger: "border-red-800 bg-red-800 text-paper active:bg-red-900",
} as const;

export function ActaGuardSheet({
  open,
  onOpenChange,
  context,
  title,
  summary,
  description,
  body,
  notice,
  icon,
  actions,
  pending = false,
  error,
  stickyActions = false,
  scrollKey,
  tall = false,
}: ActaGuardSheetProps) {
  const focus = useActaDialogFocus();
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          {...focus}
          className={`${styles.panel} ${styles.panelGuard} ${tall ? "max-h-[min(94dvh,52rem)]" : "max-h-[min(92dvh,38rem)]"}`}
          onEscapeKeyDown={(event) => pending && event.preventDefault()}
          onPointerDownOutside={(event) => pending && event.preventDefault()}
        >
          <div className="bg-pool-deep text-paper flex shrink-0 items-start justify-between gap-3 px-5 pt-5 pb-4">
            <div className="min-w-0">
              <p className="text-ball-gold text-sm font-extrabold tracking-wider uppercase">
                {context}
              </p>
              <Dialog.Title className="font-display mt-1 text-xl leading-tight font-extrabold text-pretty">
                {title}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Cerrar aviso"
                disabled={pending}
                className="border-paper/60 text-paper focus-visible:ring-ball-gold focus-visible:ring-offset-pool-deep flex min-h-12 min-w-12 shrink-0 items-center justify-center rounded-xl border-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </div>

          <div
            role={!stickyActions ? "region" : undefined}
            aria-label={!stickyActions ? `Contenido de ${title}` : undefined}
            tabIndex={!stickyActions ? 0 : undefined}
            className={`min-h-0 ${stickyActions ? "flex flex-col overflow-hidden" : "overflow-y-auto overscroll-contain"} px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]`}
          >
            <div
              key={scrollKey}
              role={stickyActions ? "region" : undefined}
              aria-label={stickyActions ? `Contenido de ${title}` : undefined}
              tabIndex={stickyActions ? 0 : undefined}
              className={stickyActions ? "min-h-0 overflow-y-auto overscroll-contain" : undefined}
            >
              {body && (
                <Dialog.Description className="sr-only">
                  {description ?? `${title}. Revisa la información y elige una opción.`}
                </Dialog.Description>
              )}
              {body ?? (
                <div className="border-pool-blue/70 bg-paper-card flex items-start gap-3 rounded-xl border-2 p-3.5">
                  <span className="bg-pool-deep text-paper flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    {icon === "saved" ? (
                      <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <CircleAlert className="h-5 w-5" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-pool-deep text-base leading-tight font-extrabold">
                      {summary}
                    </p>
                    <Dialog.Description className="text-ink-700 mt-1 text-base leading-snug">
                      {description}
                    </Dialog.Description>
                  </div>
                </div>
              )}

              {notice ? (
                <Dialog.Description className="border-pool-deep text-pool-deep mt-3 rounded-xl border-2 bg-amber-100 px-4 py-3 text-base leading-snug font-semibold">
                  {notice}
                </Dialog.Description>
              ) : null}

              {error && !stickyActions ? (
                <p
                  role="alert"
                  className="bg-paper-card mt-3 rounded-xl border-2 border-red-800 p-3 text-sm font-bold text-red-800"
                >
                  {error}
                </p>
              ) : null}
            </div>
            <div className={`mt-4 grid shrink-0 gap-2.5 ${stickyActions ? "bg-paper-card" : ""}`}>
              {error && stickyActions ? (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-900">
                  {error}
                </p>
              ) : null}
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  disabled={pending}
                  onClick={() => void action.onClick()}
                  className={`${actionClasses[action.tone]} ${action.tone === "subtle" ? "font-semibold" : "font-extrabold"} focus-visible:ring-pool-blue focus-visible:ring-offset-paper flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-center text-base leading-tight transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50`}
                >
                  {pending && action.tone === "primary" ? (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  ) : null}
                  <span className="flex flex-col items-center gap-0.5">
                    <span>{action.label}</span>
                    {action.detail ? (
                      <span className="text-sm font-semibold opacity-90">{action.detail}</span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
