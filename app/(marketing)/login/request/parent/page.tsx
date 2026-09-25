import type { Metadata } from "next";

import { AuthRequestShell } from "@/components/auth/auth-request-shell";
import { AccessRequestParentForm } from "@/components/auth/access-request-parent-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Solicitar acceso como padre/madre — Morvedre Core",
  description: "Solicita acceso como padre o madre a la app del club.",
};

export default async function ParentRequestPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const googleUser = user?.email_confirmed_at && user.identities?.some((identity) => identity.provider === "google") ? user : null;
  const email = googleUser?.email ?? "";

  return (
    <AuthRequestShell
      title="Solicitar acceso como padre/madre"
      subtitle="Indica tus datos y los de tus hijos. No necesitan tener cuenta propia."
    >
      <AccessRequestParentForm email={email} lockedEmail={!!googleUser} />
    </AuthRequestShell>
  );
}
