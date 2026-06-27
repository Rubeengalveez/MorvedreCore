"use server";

import { revalidatePath } from "next/cache";

import { updateProfileSchema } from "@/lib/domain/admin-schemas";
import { createClient } from "@/lib/supabase/server";

export type UpdateProfileState = { ok?: true; error?: string } | null;

export async function updateProfile(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const parsed = updateProfileSchema.safeParse({
    full_name: formData.get("full_name"),
    photo_url: formData.get("photo_url"),
    birth_year: formData.get("birth_year"),
    cap_number: formData.get("cap_number"),
    phone_e164: formData.get("phone_e164"),
    email_contact: formData.get("email_contact"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Tu sesión ha caducado. Vuelve a iniciar sesión." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      photo_url: parsed.data.photo_url,
      birth_year: parsed.data.birth_year,
      cap_number: parsed.data.cap_number,
      phone_e164: parsed.data.phone_e164,
      email_contact: parsed.data.email_contact,
      notes: parsed.data.notes,
    })
    .eq("auth_user_id", user.id);

  if (error) {
    return { error: "No pudimos guardar los cambios. Inténtalo de nuevo." };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");

  return { ok: true };
}
