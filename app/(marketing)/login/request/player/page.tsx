import type { Metadata } from "next";

import { AuthRequestShell } from "@/components/auth/auth-request-shell";
import { AccessRequestPlayerForm } from "@/components/auth/access-request-player-form";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const admin = createAdminClient();
  const { data: season } = await admin.from("seasons").select("id")
    .eq("is_current", true).maybeSingle();
  const { data: teams } = season ? await admin.from("teams").select("id, label")
    .eq("season_id", season.id).order("label") : { data: [] };

  return (
    <AuthRequestShell
      title="Solicitar acceso como jugador"
      subtitle="Indica tu nombre, año de nacimiento y equipo tal como figuran en el club. Revisaremos tu solicitud antes de vincular el perfil."
    >
      <AccessRequestPlayerForm email={email} lockedEmail={!!googleUser} teams={teams ?? []} />
    </AuthRequestShell>
  );
}
