"use server";

import { redirect } from "next/navigation";
import type { Route } from "next";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const signInSchema = z.object({
  email: z.string().email("Introduce un email válido."),
  password: z.string().min(1, "La contraseña es obligatoria."),
});

const emailSchema = z.object({
  email: z.string().email("Introduce un email válido."),
});

const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{10,}$/;

const updatePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(10, "Mínimo 10 caracteres.")
      .regex(
        PASSWORD_REGEX,
        "La contraseña debe tener al menos una letra y un número.",
      ),
    confirmPassword: z.string().min(1, "Confirma la contraseña."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type SignInState = { error?: string } | null;
export type PasswordResetState = { error?: string; success?: boolean } | null;
export type UpdatePasswordState = { error?: string } | null;

function getSafeRedirectPath(value: FormDataEntryValue | null, fallback: string) {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export async function signIn(_prevState: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Email o contraseña incorrectos." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("must_change_password")
    .eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
    .maybeSingle();

  const fallback = getSafeRedirectPath(formData.get("next"), "/dashboard");
  const target = profile?.must_change_password ? "/change-password" : fallback;

  redirect(target as Route);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login" as Route);
}

export async function requestPasswordReset(
  _prevState: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const parsed = emailSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Email inválido." };
  }

  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/api/auth/callback?next=/change-password`,
  });

  if (error) {
    return { error: "No pudimos enviar el email. Inténtalo de nuevo." };
  }

  return { success: true };
}

export async function updatePassword(
  _prevState: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const parsed = updatePasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Tu sesión ha caducado. Vuelve a iniciar sesión." };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (updateError) {
    return { error: "No pudimos cambiar la contraseña. Inténtalo de nuevo." };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("auth_user_id", user.id);

  if (profileError) {
    return { error: "Contraseña cambiada, pero no pudimos actualizar el perfil." };
  }

  redirect("/dashboard" as Route);
}
