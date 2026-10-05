import { ShoppingBag, Loader2 } from "lucide-react";
import { AdminPageShell } from "@/components/admin/admin-page";

export default function ShopLoading() {
  return (
    <AdminPageShell className="pb-4">
      <div className="flex min-h-[calc(100dvh-var(--top-bar-height)-var(--bottom-nav-height)-6rem)] items-center justify-center py-6">
        <section
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="border-pool-deep/65 text-pool-deep w-full max-w-sm overflow-hidden rounded-3xl border-2 bg-white shadow-lg"
        >
          <div className="bg-pool-deep flex items-center gap-3 px-6 py-5 text-white">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/40 bg-white/10">
              <ShoppingBag className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-extrabold">Tienda</h1>
          </div>
          <div className="grid justify-items-center gap-4 px-6 py-8 text-center">
            <span
              className="border-pool-blue/60 grid h-16 w-16 place-items-center rounded-2xl border-2 bg-blue-50"
              aria-hidden="true"
            >
              <Loader2 className="text-pool-blue h-8 w-8 motion-safe:animate-spin" />
            </span>
            <h2 className="text-2xl leading-tight font-extrabold text-balance">
              Preparando la tienda
            </h2>
            <p className="max-w-[28ch] text-base leading-relaxed text-slate-700">
              Estamos cargando productos y pedidos.
            </p>
          </div>
        </section>
      </div>
    </AdminPageShell>
  );
}
