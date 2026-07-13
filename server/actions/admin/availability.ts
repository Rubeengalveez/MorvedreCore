"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import { setAvailabilitySchema } from "@/lib/domain/admin-schemas";

export type AvailabilityRow = Tables<"match_availability">;

function throwIfError(error: { message: string } | null, fallback: string): void {
  if (error) {
    throw new Error(fallback);
  }
}

async function loadCurrentUserProfile(): Promise<{
  id: string;
  isAdmin: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No has iniciado sesión.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  throwIfError(profileError, "No pudimos verificar tu identidad.");
  if (!profile) {
    throw new Error("Tu perfil no está configurado.");
  }

  const { data: adminRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", profile.id)
    .eq("role", "admin")
    .is("scope_team_id", null)
    .maybeSingle();

  return { id: profile.id, isAdmin: Boolean(adminRole) };
}

export async function setAvailability(input: {
  player_id: string;
  date: string;
  available: boolean;
  reason?: string | null;
}): Promise<AvailabilityRow> {
  const me = await loadCurrentUserProfile();

  if (!me.isAdmin && me.id !== input.player_id) {
    throw new Error("Solo puedes modificar tu propia disponibilidad.");
  }

  const parsed = setAvailabilitySchema.safeParse({
    date: input.date,
    available: input.available,
    reason: input.reason,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("match_availability")
    .upsert(
      {
        player_id: input.player_id,
        date: parsed.data.date,
        available: parsed.data.available,
        reason: parsed.data.reason ?? null,
      },
      { onConflict: "player_id,date" },
    )
    .select("*")
    .single();

  throwIfError(error, "No pudimos guardar la disponibilidad. Inténtalo de nuevo.");
  if (!data) {
    throw new Error("No pudimos guardar la disponibilidad. Inténtalo de nuevo.");
  }

  revalidatePath("/profile");
  revalidatePath("/calendar");

  return data;
}

export async function setMyAvailability(input: {
  date: string;
  available: boolean;
  reason?: string | null;
}): Promise<AvailabilityRow> {
  const me = await loadCurrentUserProfile();
  return setAvailability({
    player_id: me.id,
    date: input.date,
    available: input.available,
    reason: input.reason,
  });
}
