import type { Metadata } from "next";

import { AuthRequestShell } from "@/components/auth/auth-request-shell";
import { AccessRequestPlayerForm } from "@/components/auth/access-request-player-form";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const googleUser = user?.identities?.some((identity) => identity.provider === "google") ? user : null;
  const email = googleUser?.email ?? (typeof emailRaw === "string" ? emailRaw : "");
  return (
    <AuthRequestShell
      title="Solicitar acceso como jugador"
      subtitle="Escribe tus datos y comprobaremos si ya tienes un perfil en el club."
    >
      <AccessRequestPlayerForm email={email} lockedEmail={!!googleUser} />
    </AuthRequestShell>
  );
}
