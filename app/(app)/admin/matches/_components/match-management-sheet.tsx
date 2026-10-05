"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { useActaDialogFocus } from "@/components/matches/use-acta-dialog-focus";

export function MatchManagementSheet({
  open,
  onOpenChange,
  title,
  children,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  pending: boolean;
}) {
  const focus = useActaDialogFocus();
  const savedScroll = useRef(0);
  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const prior = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    savedScroll.current = window.scrollY;
    body.style.position = "fixed";
    body.style.top = `-${savedScroll.current}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    return () => {
      Object.assign(body.style, prior);
      window.scrollTo(0, savedScroll.current);
    };
  }, [open]);
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-pool-deep/65 fixed inset-0 z-50 touch-none backdrop-blur-sm" />
        <Dialog.Content
          {...focus}
          onEscapeKeyDown={(event) => pending && event.preventDefault()}
          onPointerDownOutside={(event) => pending && event.preventDefault()}
          className="border-pool-deep text-pool-deep fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[calc(100dvh-1rem)] max-w-xl flex-col overflow-hidden rounded-t-3xl border-2 bg-slate-50 shadow-2xl"
        >
          <div className="bg-pool-deep flex shrink-0 items-center justify-between gap-3 px-4 py-4 text-white">
            <div>
              <p className="text-ball-gold text-sm font-extrabold">PARTIDOS</p>
              <Dialog.Title className="mt-1 text-xl font-extrabold">{title}</Dialog.Title>
            </div>
            <button
              type="button"
              aria-label="Cerrar nuevo partido"
              disabled={pending}
              onClick={() => onOpenChange(false)}
              className="focus-visible:outline-ball-gold flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-white/65 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
          <Dialog.Description className="sr-only">
            Completa los datos del partido, revisa el resumen y guarda. Puedes volver entre los
            pasos.
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
