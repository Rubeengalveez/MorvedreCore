import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { Route } from "next";

import { Logo } from "@/components/brand/logo";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
      className="bg-paper flex min-h-dvh flex-col items-center justify-center px-6 py-12"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <Logo size={64} withWordmark />
        <div
          className="border-ink-300 bg-paper flex w-full flex-col gap-1 rounded-md border p-4 text-center"
          style={{ borderTopWidth: "4px", borderTopColor: "var(--brand-action)" }}
        >
          <h1 className="font-display text-pool-deep text-2xl font-extrabold">Activa tu cuenta</h1>
          <p className="text-ink-600 text-sm">
            Tu cuenta está casi lista, solo falta una contraseña.
          </p>
        </div>
        <div className="w-full">
          <ChangePasswordForm />
        </div>
      </div>
    </main>
  );
}
