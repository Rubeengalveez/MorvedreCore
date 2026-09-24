import type { Metadata } from "next";

import { AuthRequestShell } from "@/components/auth/auth-request-shell";
import { AccessRequestParentForm } from "@/components/auth/access-request-parent-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Solicitar acceso como padre/madre — Morvedre Core",
  description: "Solicita acceso como padre o madre a la app del club.",
};

export default async function ParentRequestPage({
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
      title="Solicitar acceso como padre/madre"
      subtitle="Indica tus datos y selecciona a tus hijos. Basta con que estén dados de alta en el club."
    >
      <AccessRequestParentForm email={email} lockedEmail={!!googleUser} />
    </AuthRequestShell>
  );
}
