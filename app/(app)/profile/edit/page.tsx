import { redirect } from "next/navigation";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, auth_user_id, full_name, photo_url, birth_year, gender, cap_number, license_active, phone_e164, email_contact, notes, team_color, school_enrolled, school_payment_paid, must_change_password, created_at, updated_at",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-brand-deep text-2xl font-extrabold tracking-tight">
          Editar perfil
        </h1>
        <p className="text-ink-600 text-sm">
          Mantén tus datos al día. Los demás solo verán lo que tú decidas.
        </p>
      </header>

      <ProfileForm profile={profile} />
    </div>
  );
}
