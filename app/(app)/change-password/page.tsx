import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { Route } from "next";
import { KeyRound } from "lucide-react";

import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { PageBackLink } from "@/components/ui/page-back-link";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("must_change_password, full_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const isActivation = profile?.must_change_password ?? false;

  return (
    <PageShell width="sm" className="gap-5 pb-8" lang="es">
      {!isActivation && <PageBackLink href="/profile/settings">Mi cuenta</PageBackLink>}
      <PageHeader
        eyebrow={isActivation ? "Último paso" : "Seguridad de la cuenta"}
        title={isActivation ? "Activa tu cuenta" : "Cambiar contraseña"}
        description={
          isActivation
            ? "Tu cuenta está casi lista. Define una contraseña personal para entrar."
            : "Elige una contraseña nueva que no utilices en otros servicios."
        }
        icon={<KeyRound className="h-6 w-6" aria-hidden="true" />}
      />
      <div className="border-pool-deep/65 bg-paper-card w-full rounded-2xl border-2 p-4 sm:p-5">
        <ChangePasswordForm returnTo={isActivation ? "/dashboard" : "/profile/settings"} />
      </div>
    </PageShell>
  );
}
