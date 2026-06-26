import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { Route } from "next";

import { Logo } from "@/components/brand/logo";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Cambia tu contraseña — Morvedre Core",
  description: "Define una nueva contraseña para tu cuenta.",
};

export default async function ChangePasswordPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login" as Route);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("must_change_password, full_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profile && !profile.must_change_password) {
    redirect("/dashboard" as Route);
  }

  return (
    <main
      lang="es"
      className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6 py-12"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <Logo size={64} withWordmark />
        <div className="flex w-full flex-col gap-2 text-center">
          <h1 className="font-display text-2xl font-extrabold text-brand-deep">
            Hola{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-ink-600">
            Crea una contraseña de al menos 10 caracteres para terminar de activar tu cuenta.
          </p>
        </div>
        <div className="w-full">
          <ChangePasswordForm />
        </div>
      </div>
    </main>
  );
}
