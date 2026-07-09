import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";

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

  return (
    <main
      lang="es"
      className="bg-paper flex min-h-dvh flex-col items-center justify-center px-6 py-12"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <Logo size={64} withWordmark />
        <div className="border-ink-300 bg-paper-card w-full rounded-md border p-6 shadow-elev-2">
          <h1 className="font-display text-pool-deep text-2xl font-extrabold">Solicitar acceso</h1>
          <p className="text-ink-600 mt-1 text-sm">
            {email ? (
              <>
                Vas a solicitar acceso con <strong className="text-ink-900">{email}</strong>.
              </>
            ) : (
              "Elige el tipo de cuenta que quieres crear."
            )}
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={playerHref}
              className="bg-pool-deep text-paper hover:bg-pool-blue flex items-center justify-center rounded-lg px-4 py-3 text-center font-semibold shadow-sm"
            >
              Soy jugador/a
            </Link>
            <Link
              href={parentHref}
              className="border-pool-deep text-pool-deep hover:bg-pool-foam flex items-center justify-center rounded-lg border-2 px-4 py-3 text-center font-semibold"
            >
              Soy padre/madre/tutor
            </Link>
          </div>

          <p className="text-ink-600 mt-4 text-center text-xs">
            ¿Ya tienes cuenta?{" "}
            <Link href={"/login" as Route} className="text-pool-blue font-semibold hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
