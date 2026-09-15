"use client";

import { Loader2 } from "lucide-react";

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
        onEscapeKeyDown={(event) => {
          if (isPending) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (isPending) event.preventDefault();
        }}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
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
        <SheetFooter>
          <Button
            type="button"
            variant={BUTTON_VARIANTS[variant]}
            size="lg"
            className="w-full"
            disabled={isPending}
            onClick={() => void onConfirm()}
          >
            {isPending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
            {isPending ? "Procesando…" : confirmLabel}
          </Button>
          <Button
            type="button"
            variant="secondary"
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
