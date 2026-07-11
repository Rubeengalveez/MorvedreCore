"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { decideShopOrder } from "@/server/actions/admin/shop";

export interface ParentDecisionFormProps {
  orderId: string;
}

export function ParentDecisionForm({ orderId }: ParentDecisionFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function decide(decision: "approve" | "reject") {
    setError(null);
    startTransition(async () => {
      try {
        await decideShopOrder({ order_id: orderId, decision });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ha habido un problema.");
      }
    });
  }

  return (
    <div className="mt-3">
      {error ? (
        <Alert variant="danger" title="No se ha podido guardar" className="mb-3">
          {error}
        </Alert>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="primary"
          size="md"
          disabled={pending}
          onClick={() => decide("approve")}
        >
          <Check className="h-4 w-4" />
          Aprobar
        </Button>
        <Sheet>
          <SheetTrigger asChild>
            <Button type="button" variant="danger" size="md" disabled={pending}>
              <X className="h-4 w-4" aria-hidden="true" />
              Rechazar
            </Button>
          </SheetTrigger>
          <SheetContent size="sm">
            <SheetHeader>
              <SheetTitle>¿Rechazar este pedido?</SheetTitle>
              <SheetDescription>
                La familia verá el pedido como rechazado. Comprueba los datos antes de continuar.
              </SheetDescription>
            </SheetHeader>
            <SheetBody />
            <SheetFooter>
              <Button
                type="button"
                variant="danger"
                size="lg"
                disabled={pending}
                onClick={() => decide("reject")}
              >
                {pending ? "Rechazando…" : "Sí, rechazar pedido"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
