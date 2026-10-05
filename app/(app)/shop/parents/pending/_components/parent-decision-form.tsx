"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { normalizeSpanishPhone } from "@/lib/domain/phone";
import { shopMoney } from "@/lib/domain/shop-management";
import { ShopDecisionSheet } from "@/components/shop/shop-decision-sheet";
import { shopControl, shopPrimary, shopSecondary } from "@/components/shop/shop-ui";
import { decideShopOrder } from "@/server/actions/admin/shop";
export interface ParentDecisionFormProps {
  orderId: string;
  initialPhone: string | null;
  totalCents?: number;
}
export function ParentDecisionForm({ orderId, initialPhone, totalCents }: ParentDecisionFormProps) {
  const router = useRouter(),
    [pending, startTransition] = useTransition(),
    [error, setError] = useState<string | null>(null),
    [phone, setPhone] = useState(initialPhone ?? ""),
    [decision, setDecision] = useState<"approve" | "reject" | null>(null),
    [done, setDone] = useState(false);
  const submitting = useRef(false);
  function decide() {
    if (!decision || submitting.current) return;
    const normalized = normalizeSpanishPhone(phone);
    if (decision === "approve" && !normalized) {
      setError("Escribe tu teléfono para que Sol pueda contactar contigo.");
      return;
    }
    if (!navigator.onLine) {
      setError("Necesitas conexión para confirmar. Vuelve a intentarlo cuando estés conectado.");
      return;
    }
    setError(null);
    submitting.current = true;
    startTransition(async () => {
      try {
        await decideShopOrder({ order_id: orderId, decision, contact_phone: normalized });
        setDecision(null);
        setDone(true);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No pudimos guardar tu decisión.");
      } finally {
        submitting.current = false;
      }
    });
  }
  if (done)
    return (
      <p
        role="status"
        className="border-pool-deep/65 text-pool-deep rounded-xl border-2 bg-blue-50 p-4 font-bold"
      >
        Decisión guardada. El estado del pedido está actualizado.
      </p>
    );
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setDecision("approve");
            setError(null);
          }}
          className={shopPrimary}
        >
          <Check className="h-5 w-5" aria-hidden="true" />
          Aprobar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setDecision("reject");
            setError(null);
          }}
          className={`${shopSecondary} border-red-800 bg-red-50 text-red-900`}
        >
          <X className="h-5 w-5" aria-hidden="true" />
          No aprobar
        </button>
      </div>
      <ShopDecisionSheet
        open={decision !== null}
        onOpenChange={(open) => !open && setDecision(null)}
        title={decision === "approve" ? "¿Aprobar y enviar a Sol?" : "¿No aprobar este pedido?"}
        icon={decision === "approve" ? "saved" : "warning"}
        pending={pending}
        error={error}
        body={
          <div className="text-pool-deep space-y-4">
            {totalCents != null ? (
              <div className="border-pool-deep/65 flex items-center justify-between gap-3 rounded-xl border-2 bg-white p-4">
                <span className="font-extrabold">Total del pedido</span>
                <strong className="text-2xl tabular-nums">{shopMoney(totalCents)}</strong>
              </div>
            ) : null}
            <p className="border-pool-deep/65 rounded-xl border bg-blue-50 p-3 font-semibold">
              {decision === "approve"
                ? "Se enviará a Sol. No pagas ahora; el importe se incluirá en el cierre mensual del club."
                : "Sol no recibirá este pedido y no se tramitará."}
            </p>
            {decision === "approve" ? (
              <div className="space-y-2">
                <label htmlFor={`phone-${orderId}`} className="block font-extrabold">
                  Tu teléfono para Sol
                </label>
                <input
                  id={`phone-${orderId}`}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  disabled={pending}
                  onChange={(event) => {
                    setPhone(event.target.value);
                    setError(null);
                  }}
                  className={shopControl}
                  placeholder="612 345 678"
                  aria-invalid={Boolean(error && !normalizeSpanishPhone(phone))}
                />
              </div>
            ) : null}
          </div>
        }
        actions={[
          {
            label: decision === "approve" ? "Aprobar pedido" : "No aprobar pedido",
            tone: decision === "approve" ? "primary" : "danger",
            onClick: decide,
          },
          { label: "Volver a revisar", tone: "secondary", onClick: () => setDecision(null) },
        ]}
      />
    </>
  );
}
