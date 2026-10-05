"use client";
import { AdminPageShell } from "@/components/admin/admin-page";
import { shopPrimary } from "@/components/shop/shop-ui";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <AdminPageShell>
      <section
        role="alert"
        className="border-pool-deep text-pool-deep space-y-4 rounded-2xl border-2 bg-white p-5"
      >
        <h1 className="text-xl font-extrabold">No pudimos cargar los entrenamientos</h1>
        <button type="button" className={`${shopPrimary} w-full`} onClick={reset}>
          Volver a intentar
        </button>
      </section>
    </AdminPageShell>
  );
}
