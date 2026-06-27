import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";

import { Logo } from "@/components/brand/logo";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Recuperar contraseña — Morvedre Core",
  description: "Te enviamos un enlace para restablecer tu contraseña.",
};

export default function ResetPasswordPage() {
  return (
    <main
      lang="es"
      className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6 py-12"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <Logo size={64} withWordmark />
        <div
          className="flex w-full flex-col gap-1 rounded-md border border-ink-300 bg-paper p-4 text-center"
          style={{ borderTopWidth: "4px", borderTopColor: "var(--brand-blue)" }}
        >
          <h1 className="font-display text-2xl font-extrabold text-brand-deep">
            ¿Se te olvidó la contraseña?
          </h1>
          <p className="text-sm text-ink-600">
            Sin problema. Te mandamos un enlace para que pongas una nueva en
            dos minutos.
          </p>
        </div>
        <div className="w-full">
          <ResetPasswordForm />
        </div>
        <Link
          href={"/login" as Route}
          className="text-sm font-semibold text-brand-blue hover:underline focus-visible:underline focus-visible:outline-none"
        >
          Volver a iniciar sesión
        </Link>
      </div>
    </main>
  );
}
