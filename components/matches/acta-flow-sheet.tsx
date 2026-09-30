"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, Loader2, X } from "lucide-react";
import styles from "./live-match.module.css";
import type { ActaGuardSheetProps } from "./acta-guard-sheet";
import { useActaDialogFocus } from "./use-acta-dialog-focus";

export function ActaFlowSheet({
  open = true,
  onClose,
  onBack,
  context,
  title,
  children,
  controls,
  footer,
  error,
  pending = false,
  closeLabel = "Cerrar",
  scrollKey,
}: {
  open?: boolean;
  onClose: () => void;
  onBack?: () => void;
  context: string;
  title: string;
  children: ReactNode;
  controls?: ReactNode;
  footer?: ReactNode;
  error?: string;
  pending?: boolean;
  closeLabel?: string;
  scrollKey?: string | number;
}) {
  const focus = useActaDialogFocus();
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && !pending && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          {...focus}
          className={`${styles.panel} ${styles.panelGuard} h-[min(94dvh,52rem)]`}
          onEscapeKeyDown={(e) => pending && e.preventDefault()}
          onPointerDownOutside={(e) => pending && e.preventDefault()}
        >
          <header className="flex shrink-0 items-center gap-2 bg-white px-4 py-2">
            {onBack && (
              <button
                type="button"
                aria-label="Atrás"
                disabled={pending}
                onClick={onBack}
                className={styles.panelNavigation}
              >
                <ChevronLeft size={20} aria-hidden="true" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-pool-blue text-sm font-bold">{context}</p>
              <Dialog.Title className="text-pool-deep text-xl leading-tight font-extrabold">
                {title}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label={closeLabel}
                disabled={pending}
                className={styles.panelNavigation}
              >
                Cerrar <X size={18} aria-hidden="true" />
              </button>
            </Dialog.Close>
            <Dialog.Description className="sr-only">{title}. Elige una opción.</Dialog.Description>
          </header>
          {controls && <div className="shrink-0 bg-white px-4 pt-1 pb-3">{controls}</div>}
          <div
            key={scrollKey}
            role="region"
            aria-label={`Contenido de ${title}`}
            tabIndex={0}
            className="focus-visible:outline-pool-blue min-h-0 flex-1 [scroll-padding-block:12px] overflow-y-auto overscroll-contain px-4 py-3 focus-visible:outline-2 focus-visible:-outline-offset-2"
          >
            {children}
          </div>
          {(footer || error) && (
            <footer className="shrink-0 space-y-2 bg-white px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
              {error && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-800 bg-red-50 px-3 py-2 text-base font-bold text-red-900"
                >
                  {error}
                </p>
              )}
              {pending && (
                <span role="status" className="flex items-center gap-2 text-sm font-semibold">
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                  Guardando…
                </span>
              )}
              {footer}
            </footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ActaSelectionSheet({
  open,
  onOpenChange,
  context,
  title,
  body,
  actions,
  pending,
  error,
}: ActaGuardSheetProps) {
  return (
    <ActaFlowSheet
      open={open}
      onClose={() => onOpenChange(false)}
      context={context}
      title={title}
      pending={pending}
      error={error ?? undefined}
      footer={
        <div className="grid gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              disabled={pending}
              onClick={() => void action.onClick()}
              className={`min-h-14 rounded-xl border-2 px-3 py-2 text-base font-bold disabled:opacity-50 ${action.tone === "primary" ? "border-pool-deep bg-pool-deep text-white" : action.tone === "danger" ? "border-red-800 bg-red-800 text-white" : "border-pool-deep text-pool-deep bg-white"}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      }
    >
      {body}
    </ActaFlowSheet>
  );
}
