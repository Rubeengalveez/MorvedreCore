import type { Metadata } from "next";

import { Logo } from "@/components/brand/logo";
import { AccessRequestPlayerForm } from "@/components/auth/access-request-player-form";

export const metadata: Metadata = {
  title: "Solicitar acceso como jugador — Morvedre Core",
  description: "Solicita acceso como jugador a la app del club.",
};

export default async function PlayerRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[] }>;
}) {
  const params = await searchParams;
  const emailRaw = Array.isArray(params.email) ? params.email[0] : params.email;
  const email = typeof emailRaw === "string" ? emailRaw : "";

  return (
    <main
      lang="es"
      className="bg-paper flex min-h-dvh flex-col items-center justify-center px-6 py-12"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <Logo size={64} withWordmark />
        <div className="border-ink-300 bg-paper-card w-full rounded-md border p-6 shadow-md">
          <h1 className="font-display text-brand-deep text-2xl font-extrabold">
            Solicitar acceso como jugador
          </h1>
          <p className="text-ink-600 mt-1 text-sm">
            Completa tus datos. Si ya estás dado de alta en el club, vincularemos tu cuenta.
          </p>
          <div className="mt-6">
            <AccessRequestPlayerForm email={email} />
          </div>
        </div>
      </div>
    </main>
  );
}
