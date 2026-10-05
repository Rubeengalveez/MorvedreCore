"use client";
import Link from "next/link";
import { PageShell } from "@/components/ui/page-shell";
import { shopPrimary, shopSecondary, ShopError } from "@/components/shop/shop-ui";
export default function ShopErrorPage({ reset }: { reset: () => void }) {
  return (
    <PageShell width="md">
      <h1 className="text-pool-deep text-3xl font-extrabold">Tienda</h1>
      <ShopError>
        No pudimos cargar esta página. Comprueba tu conexión y vuelve a intentarlo. Tu carrito sigue
        guardado.
      </ShopError>
      <button type="button" className={shopPrimary} onClick={reset}>
        Volver a intentar
      </button>
      <Link href="/shop" className={shopSecondary}>
        Volver a productos
      </Link>
    </PageShell>
  );
}
