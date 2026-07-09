import type { Metadata } from "next";

import { AuthRequestShell } from "@/components/auth/auth-request-shell";
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
    <AuthRequestShell
      title="Solicitar acceso como jugador"
      subtitle="Completa tus datos. Si ya est&aacute;s dado de alta en el club, vincularemos tu cuenta."
    >
      <AccessRequestPlayerForm email={email} />
    </AuthRequestShell>
  );
}
