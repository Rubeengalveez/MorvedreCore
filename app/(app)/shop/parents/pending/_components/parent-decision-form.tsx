"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
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
        <div
          role="alert"
          className="mb-2 rounded border border-goggle-red/30 bg-goggle-red/5 px-2 py-1 text-[11px] font-bold text-goggle-red"
        >
          {error}
        </div>
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
        <Button
          type="button"
          variant="danger"
          size="md"
          disabled={pending}
          onClick={() => decide("reject")}
        >
          <X className="h-4 w-4" />
          Rechazar
        </Button>
      </div>
    </div>
  );
}
