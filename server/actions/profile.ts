"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

const updateProfileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres.")
    .max(100, "Máximo 100 caracteres."),
  photo_url: z.preprocess(
    emptyToNull,
    z
      .string()
      .url("URL inválida.")
      .nullable(),
  ),
  birth_year: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z
      .number()
      .int("Año entero.")
      .min(1900, "Año entre 1900 y 2100.")
      .max(2100, "Año entre 1900 y 2100.")
      .nullable(),
  ),
  cap_number: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z
      .number()
      .int("Dorsal entero.")
      .min(0, "Mínimo 0.")
      .max(99, "Máximo 99.")
      .nullable(),
  ),
  license_active: z.preprocess(
    (v) => v === "on" || v === "true" || v === true,
    z.boolean(),
  ),
  phone_e164: z.preprocess(
    emptyToNull,
    z
      .string()
      .regex(
        /^\+[1-9]\d{6,14}$/,
        "Formato E.164: +34612345678",
      )
      .nullable(),
  ),
  email_contact: z.preprocess(
    emptyToNull,
    z.string().email("Email inválido.").nullable(),
  ),
});

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
    license_active: formData.get("license_active"),
    phone_e164: formData.get("phone_e164"),
    email_contact: formData.get("email_contact"),
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
      license_active: parsed.data.license_active,
      phone_e164: parsed.data.phone_e164,
      email_contact: parsed.data.email_contact,
    })
    .eq("auth_user_id", user.id);

  if (error) {
    return { error: "No pudimos guardar los cambios. Inténtalo de nuevo." };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");

  return { ok: true };
}
