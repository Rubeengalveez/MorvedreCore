import type { Metadata } from "next";
import { AuthRequestShell } from "@/components/auth/auth-request-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Recuperar contraseña — Morvedre Core",
  description: "Te enviamos un enlace para restablecer tu contraseña.",
};

export default function ResetPasswordPage() {
  return (
    <AuthRequestShell
      title="¿Se te olvidó la contraseña?"
      subtitle="Te enviaremos un enlace para que puedas definir una nueva."
    >
      <ResetPasswordForm />
    </AuthRequestShell>
  );
}
