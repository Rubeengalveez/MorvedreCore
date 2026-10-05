import Link from "next/link";
import { PageShell } from "@/components/ui/page-shell";
import { shopPrimary } from "@/components/shop/shop-ui";
export default function MissingNotification() {
  return (
    <PageShell width="md">
      <section className="border-pool-deep/65 text-pool-deep space-y-4 rounded-2xl border-2 bg-white p-5">
        <h1 className="text-2xl font-extrabold">Este aviso ya no está disponible</h1>
        <Link href="/notifications" className={`${shopPrimary} w-full`}>
          Volver a notificaciones
        </Link>
      </section>
    </PageShell>
  );
}
