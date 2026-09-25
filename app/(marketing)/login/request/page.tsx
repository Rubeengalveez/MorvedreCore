import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import { AuthRequestShell } from "@/components/auth/auth-request-shell";

export const metadata: Metadata = {
  title: "Solicitar acceso — Morvedre Core",
  description: "Solicita acceso a la app del club.",
};

export default function LoginRequestPage() {
  return (
    <AuthRequestShell title="Solicitar acceso" subtitle="Elige el tipo de cuenta que quieres crear." showNextSteps
      backHref={"/login" as Route} backLabel="Volver al acceso">
      <div className="flex flex-col gap-3">
        <Link
          href={"/login/request/player" as Route}
          className="bg-pool-blue text-paper hover:bg-pool-deep active:bg-pool-deep font-display shadow-elev-2 flex items-center justify-center rounded-[var(--r-sm)] px-4 py-3.5 text-center font-semibold transition-colors"
        >
          Soy jugador/a
        </Link>
        <Link
          href={"/login/request/parent" as Route}
          className="border-pool-deep text-pool-deep hover:bg-pool-foam font-display flex items-center justify-center rounded-[var(--r-sm)] border-2 px-4 py-3.5 text-center font-semibold transition-colors"
        >
          Soy padre o madre
        </Link>
      </div>
    </AuthRequestShell>
  );
}
