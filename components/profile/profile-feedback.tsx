"use client";
import Link from "next/link";
import { CircleAlert, Loader2, UserRound } from "lucide-react";
import { PageShell } from "@/components/ui/page-shell";
import { shopPrimary, shopSecondary } from "@/components/shop/shop-ui";

export function ProfileLoading({
  title = "Mi perfil",
  message = "Preparando tus datos…",
}: { title?: string; message?: string } = {}) {
  return (
    <PageShell width="md">
      <div className="flex min-h-[calc(100dvh-var(--top-bar-height)-var(--bottom-nav-height)-3rem)] items-center justify-center">
        <section
          role="status"
          aria-busy="true"
          className="border-pool-deep/65 text-pool-deep w-full max-w-sm overflow-hidden rounded-3xl border-2 bg-white"
        >
          <div className="bg-pool-deep flex items-center gap-3 px-5 py-5 text-white">
            <UserRound aria-hidden="true" className="h-7 w-7" />
            <h1 className="text-2xl font-extrabold">{title}</h1>
          </div>
          <div className="grid justify-items-center gap-4 px-6 py-8 text-center">
            <Loader2
              aria-hidden="true"
              className="text-pool-blue h-10 w-10 motion-safe:animate-spin"
            />
            <p className="text-xl font-extrabold">{message}</p>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
export function ProfileProblem({ reset }: { reset: () => void }) {
  return (
    <PageShell width="md">
      <section className="border-pool-deep/65 text-pool-deep overflow-hidden rounded-2xl border-2 bg-white">
        <div className="bg-pool-deep flex items-center gap-3 p-5 text-white">
          <CircleAlert aria-hidden="true" className="h-7 w-7" />
          <h1 className="text-2xl font-extrabold">No pudimos cargar tu perfil</h1>
        </div>
        <div className="space-y-3 p-5">
          <p>Comprueba tu conexión y vuelve a intentarlo.</p>
          <button type="button" className={`${shopPrimary} w-full`} onClick={reset}>
            Volver a intentar
          </button>
          <Link href="/dashboard" className={`${shopSecondary} w-full`}>
            Volver a Inicio
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
