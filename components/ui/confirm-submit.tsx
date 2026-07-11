"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function ConfirmSubmit({
  formId,
  title,
  description,
  triggerLabel = "Eliminar",
  confirmLabel = "Sí, eliminar",
}: {
  formId: string;
  title: string;
  description: string;
  triggerLabel?: string;
  confirmLabel?: string;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="border-goggle-red/25 bg-paper text-goggle-red hover:bg-goggle-red/5 focus-visible:ring-goggle-red inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-lg border px-3 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {triggerLabel}
        </button>
      </SheetTrigger>
      <SheetContent size="sm">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-2 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <Button type="submit" form={formId} variant="danger" size="lg" className="w-full">
            <Trash2 className="h-5 w-5" aria-hidden="true" />
            {confirmLabel}
          </Button>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
