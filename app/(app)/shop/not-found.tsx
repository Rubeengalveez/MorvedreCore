import Link from "next/link";
import { PackageOpen } from "lucide-react";
import { PageShell } from "@/components/ui/page-shell";
import { shopPrimary, shopSecondary } from "@/components/shop/shop-ui";
export default function ShopNotFound() {
  return (
    <PageShell width="md" className="gap-4">
      <section className="border-pool-deep/65 text-pool-deep space-y-4 rounded-2xl border-2 bg-white p-6 text-center">
        <PackageOpen className="mx-auto h-12 w-12" aria-hidden="true" />
        <h1 className="text-2xl font-extrabold">Ya no está disponible</h1>
        <p className="text-base">Puedes volver a los productos o consultar tus pedidos.</p>
        <Link href="/shop" className={`${shopPrimary} w-full`}>
          Volver a productos
        </Link>
        <Link href="/shop/orders" className={`${shopSecondary} w-full`}>
          Mis pedidos
        </Link>
      </section>
    </PageShell>
  );
}
