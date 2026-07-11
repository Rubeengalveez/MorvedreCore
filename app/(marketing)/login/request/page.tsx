import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import { AuthRequestShell } from "@/components/auth/auth-request-shell";

export const metadata: Metadata = {
  title: "Solicitar acceso — Morvedre Core",
  description: "Solicita acceso a la app del club.",
};

export default async function LoginRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[]; provider?: string | string[] }>;
}) {
  const params = await searchParams;
  const emailRaw = Array.isArray(params.email) ? params.email[0] : params.email;
  const email = typeof emailRaw === "string" ? emailRaw : "";

  const encodedEmail = encodeURIComponent(email);
  const playerHref = `/login/request/player?email=${encodedEmail}` as Route;
  const parentHref = `/login/request/parent?email=${encodedEmail}` as Route;

  const subtitle = email ? (
    <>
      Vas a solicitar acceso con <strong className="text-ink-900">{email}</strong>.
    </>
  ) : (
    "Elige el tipo de cuenta que quieres crear."
  );

  return (
    <AuthRequestShell title="Solicitar acceso" subtitle={subtitle}>
      <div className="flex flex-col gap-3">
        <Link
          href={playerHref}
          className="bg-pool-blue text-paper hover:bg-pool-deep active:bg-pool-deep font-display shadow-elev-2 flex items-center justify-center rounded-[var(--r-sm)] px-4 py-3.5 text-center font-semibold transition-colors"
        >
          Soy jugador/a
        </Link>
        <Link
          href={parentHref}
          className="border-pool-deep text-pool-deep hover:bg-pool-foam font-display flex items-center justify-center rounded-[var(--r-sm)] border-2 px-4 py-3.5 text-center font-semibold transition-colors"
        >
          Soy padre/madre/tutor
        </Link>
      </div>
    </AuthRequestShell>
  );
}
