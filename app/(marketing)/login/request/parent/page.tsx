import type { Metadata } from "next";

import { AuthRequestShell } from "@/components/auth/auth-request-shell";
import { AccessRequestParentForm } from "@/components/auth/access-request-parent-form";

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
  const email = typeof emailRaw === "string" ? emailRaw : "";

  return (
    <AuthRequestShell
      title="Solicitar acceso como padre/madre"
      subtitle="Completa tus datos y selecciona a tus hijos/as. Deben tener la cuenta activada."
    >
      <AccessRequestParentForm email={email} />
    </AuthRequestShell>
  );
}
