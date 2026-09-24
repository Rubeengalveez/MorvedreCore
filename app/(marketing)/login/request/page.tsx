import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import { AuthRequestShell } from "@/components/auth/auth-request-shell";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.identities?.some((identity) => identity.provider === "google")
    ? (user.email ?? "") : (typeof emailRaw === "string" ? emailRaw : "");

  const encodedEmail = encodeURIComponent(email);
  const playerHref = `/login/request/player?email=${encodedEmail}` as Route;
  const parentHref = `/login/request/parent?email=${encodedEmail}` as Route;
  const staffHref = `/login/request/staff?email=${encodedEmail}` as Route;

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
        <Link href={staffHref}
          className="border-pool-blue/25 bg-pool-foam/60 text-pool-deep font-display flex min-h-12 items-center justify-center rounded-[var(--r-sm)] border px-4 text-center font-semibold transition-colors hover:bg-pool-foam">
          Personal y directiva
        </Link>
      </div>
    </AuthRequestShell>
  );
}
