"use client";

import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type ConfirmActionSheetVariant = "danger" | "warning" | "pool";

export interface ConfirmActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmActionSheetVariant;
  isPending?: boolean;
  error?: string | null;
  onConfirm: () => void | Promise<void>;
}

const BUTTON_VARIANTS = {
  danger: "danger",
  warning: "gold",
  pool: "primary",
} as const;

export function ConfirmActionSheet({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  isPending = false,
  error,
  onConfirm,
}: ConfirmActionSheetProps) {
  function handleOpenChange(nextOpen: boolean) {
    if (!isPending) onOpenChange(nextOpen);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        size="sm"
        showClose={!isPending}
        className="bg-paper-card gap-3"
        onEscapeKeyDown={(event) => {
          if (isPending) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (isPending) event.preventDefault();
        }}
      >
        <SheetHeader className="pr-16">
          <div className="flex items-start gap-3">
            <span className="bg-danger/10 text-danger flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
              <Trash2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 pt-0.5">
              <SheetTitle className="text-lg leading-tight">{title}</SheetTitle>
              <SheetDescription className="mt-1 leading-5">{description}</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-3 pt-1">
          {error ? (
            <p
              role="alert"
              className="border-danger/25 bg-danger/5 text-danger rounded-xl border p-3 text-sm font-semibold"
            >
              {error}
            </p>
          ) : null}
        </SheetBody>
        <SheetFooter className="border-t-0 pt-1">
          <Button
            type="button"
            variant={BUTTON_VARIANTS[variant]}
            size="lg"
            className="w-full rounded-xl shadow-sm"
            disabled={isPending}
            onClick={() => void onConfirm()}
          >
            {isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : variant === "danger" ? (
              <Trash2 className="h-5 w-5" aria-hidden="true" />
            ) : null}
            {isPending ? "Procesando…" : confirmLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="w-full"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
