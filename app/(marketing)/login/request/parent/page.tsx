import type { Metadata } from "next";

import { AuthRequestShell } from "@/components/auth/auth-request-shell";
import { AccessRequestParentForm } from "@/components/auth/access-request-parent-form";

export const metadata: Metadata = {
  title: "Solicitar acceso como padre/madre — Morvedre Core",
  description: "Solicita acceso como padre o madre a la app del club.",
};

export default function ParentRequestPage() {
  return (
    <AuthRequestShell
      title="Solicitar acceso como padre/madre"
      subtitle="Indica tus datos y los de tus hijos. No necesitan tener cuenta propia."
    >
      <AccessRequestParentForm />
    </AuthRequestShell>
  );
}
