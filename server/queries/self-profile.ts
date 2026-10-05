import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const getSelfProfile = cache(async () => {
  const db = await createClient();
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();
  if (authError || !user) return null;
  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select(
      "id,full_name,photo_url,birth_year,cap_number,phone_e164,email_contact,team_color,updated_at,is_active",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (error) throw new Error("No pudimos cargar tus datos personales.");
  if (!profile?.is_active) return null;
  const { data: roles, error: rolesError } = await db
    .from("user_roles")
    .select("role")
    .eq("profile_id", profile.id);
  if (rolesError) throw new Error("No pudimos comprobar tu ficha del club.");
  return {
    profile,
    loginEmail: user.email ?? null,
    isPlayer: (roles ?? []).some((row) => row.role === "player"),
  };
});
