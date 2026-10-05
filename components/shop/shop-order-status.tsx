import { Check, Clock3, X } from "lucide-react";
import type { ShopOrderStatus } from "@/lib/domain/shop";
import { cn } from "@/lib/utils/cn";
export function shopPublicStatus(status: ShopOrderStatus) {
  if (status === "pending_parent")
    return {
      label: "Por aprobar",
      detail: "Tu familia debe aprobarlo antes de que llegue a Sol.",
      tone: "amber",
      icon: Clock3,
    } as const;
  if (status === "delivered")
    return {
      label: "Entregado",
      detail: "Sol ya ha entregado este pedido.",
      tone: "green",
      icon: Check,
    } as const;
  if (status === "cancelled" || status === "rejected")
    return {
      label: status === "rejected" ? "No aprobado" : "Cancelado",
      detail: "Este pedido no se tramitará.",
      tone: "grey",
      icon: X,
    } as const;
  return {
    label: "En preparación",
    detail:
      status === "received"
        ? "El material está en el club. Sol te avisará para recogerlo."
        : "Pedido enviado a Sol. Lo tienes registrado y no necesitas enviarlo otra vez.",
    tone: "blue",
    icon: Clock3,
  } as const;
}
export function ShopOrderStatus({ status }: { status: ShopOrderStatus }) {
  const state = shopPublicStatus(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm font-bold",
        state.tone === "green"
          ? "border-emerald-800 bg-emerald-50 text-emerald-900"
          : state.tone === "amber"
            ? "border-amber-800 bg-amber-100 text-amber-950"
            : state.tone === "blue"
              ? "border-pool-deep/65 text-pool-deep bg-blue-50"
              : "border-slate-600 bg-slate-100 text-slate-800",
      )}
    >
      <state.icon className="h-4 w-4" aria-hidden="true" />
      {state.label}
    </span>
  );
}
