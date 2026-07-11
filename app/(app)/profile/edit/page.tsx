import { redirect } from "next/navigation";
import { UserRound } from "lucide-react";

import type { Database } from "@/lib/supabase/types";
import { AppPageHero } from "@/components/ui/app-page-hero";
import { PageShell } from "@/components/ui/page-shell";
import { ProfileForm } from "@/app/(app)/profile/profile-form";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Editar perfil — Morvedre Core",
  description: "Edita tu información personal.",
};

export default async function ProfileEditPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let finalProfile: Database["public"]["Tables"]["profiles"]["Row"] | null = null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, auth_user_id, full_name, photo_url, birth_year, gender, cap_number, license_active, phone_e164, email_contact, notes, team_color, school_enrolled, school_payment_paid, must_change_password, calendar_token, created_at, updated_at",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profile) {
    finalProfile = profile;
  } else if (error) {
    const isMissingCol =
      error.message.includes("calendar_token") || error.message.includes("does not exist");
    if (isMissingCol) {
      console.warn(
        "⚠️ ALERTA: La columna calendar_token no existe en profiles. Ejecuta 'pnpm supabase db push'.",
      );
      const { data: fallbackProfile, error: fallbackError } = await supabase
        .from("profiles")
        .select(
          "id, auth_user_id, full_name, photo_url, birth_year, gender, cap_number, license_active, phone_e164, email_contact, notes, team_color, school_enrolled, school_payment_paid, must_change_password, created_at, updated_at",
        )
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!fallbackError && fallbackProfile) {
        finalProfile = {
          ...fallbackProfile,
          calendar_token: "",
        };
      }
    }
  }

  if (!finalProfile) {
    redirect("/login");
  }

  return (
    <PageShell width="md" className="gap-5 pb-8">
      <AppPageHero
        eyebrow="Tu cuenta"
        title="Editar perfil"
        description="Mantén tus datos al día. Tu información de contacto sigue siendo privada."
        icon={<UserRound className="h-6 w-6" aria-hidden="true" />}
      />

      <ProfileForm profile={finalProfile} />
    </PageShell>
  );
}
