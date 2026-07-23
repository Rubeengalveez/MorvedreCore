"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Phone, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { normalizeSpanishPhone } from "@/lib/domain/phone";
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
  initialPhone: string | null;
}

export function ParentDecisionForm({ orderId, initialPhone }: ParentDecisionFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [phoneOpen, setPhoneOpen] = useState(false);

  function decide(decision: "approve" | "reject", contactPhone?: string) {
    setError(null);
    startTransition(async () => {
      try {
        await decideShopOrder({ order_id: orderId, decision, contact_phone: contactPhone });
        setPhoneOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ha habido un problema.");
      }
    });
  }

  function handleApprove() {
    if (initialPhone) {
      decide("approve");
      return;
    }
    setPhoneOpen(true);
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
          onClick={handleApprove}
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

      <Sheet open={phoneOpen} onOpenChange={setPhoneOpen}>
        <SheetContent size="md">
          <SheetHeader>
            <span className="bg-pool-foam text-pool-blue mb-2 flex h-11 w-11 items-center justify-center rounded-xl">
              <Phone className="h-5 w-5" aria-hidden="true" />
            </span>
            <SheetTitle>Teléfono de la persona que aprueba</SheetTitle>
            <SheetDescription>
              La tienda usará tu teléfono, no el del menor. Lo guardaremos en tu perfil para los
              próximos pedidos.
            </SheetDescription>
          </SheetHeader>
          <SheetBody>
            <label
              htmlFor={`parent-shop-phone-${orderId}`}
              className="text-pool-deep text-sm font-extrabold"
            >
              Tu teléfono de contacto
            </label>
            <Input
              id={`parent-shop-phone-${orderId}`}
              name="contact_phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                setError(null);
              }}
              placeholder="Ejemplo: 612 345 678"
              className="mt-2"
            />
            {phone && !normalizeSpanishPhone(phone) ? (
              <p role="alert" className="text-goggle-red mt-2 text-sm font-semibold">
                Escribe un teléfono válido de 9 cifras o con prefijo internacional.
              </p>
            ) : null}
          </SheetBody>
          <SheetFooter>
            <Button
              type="button"
              size="lg"
              disabled={pending || !normalizeSpanishPhone(phone)}
              onClick={() => {
                const normalized = normalizeSpanishPhone(phone);
                if (!normalized) return;
                setPhone(normalized);
                decide("approve", normalized);
              }}
            >
              {pending ? "Aprobando…" : "Guardar teléfono y aprobar"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
