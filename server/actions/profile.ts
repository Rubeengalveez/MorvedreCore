"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { z } from "zod";
import { selfProfilePayload, selfProfileSchema } from "@/lib/domain/self-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { validateAvatarImageFile } from "@/lib/uploads/images";

export type UpdateProfileState = { ok?: true; error?: string } | null;

export async function updateProfile(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const parsed = selfProfileSchema.safeParse({
    full_name: formData.get("full_name"),
    phone_e164: formData.get("phone_e164") ?? "",
    email_contact: formData.get("email_contact") ?? "",
    cap_number: formData.get("cap_number") ? Number(formData.get("cap_number")) : null,
  });
  const revision = z.iso.datetime({ offset: true }).safeParse(formData.get("updated_at"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Revisa tus datos." };
  if (!revision.success) return { error: "Vuelve a abrir tus datos antes de guardar." };
  const db = await createClient();
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();
  if (authError || !user) return { error: "Tu sesión ha caducado. Vuelve a iniciar sesión." };
  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,birth_year,photo_url,updated_at,is_active")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (profileError || !profile?.is_active)
    return { error: "No pudimos localizar tu perfil activo." };
  if (profile.updated_at !== revision.data)
    return {
      error: "Tus datos han cambiado en otra sesión. Vuelve a abrir la ficha para revisarlos.",
    };
  if (
    formData.has("birth_year") &&
    String(formData.get("birth_year") ?? "") !== String(profile.birth_year ?? "")
  )
    return {
      error: "El club gestiona el año de nacimiento. Pide a un administrador que lo revise.",
    };
  const { data: roles, error: rolesError } = await db
    .from("user_roles")
    .select("role")
    .eq("profile_id", profile.id);
  if (rolesError) return { error: "No pudimos comprobar tu ficha del club." };
  const isPlayer = (roles ?? []).some((role) => role.role === "player");
  if (!isPlayer && formData.has("cap_number"))
    return { error: "El gorro solo se puede cambiar en una ficha de jugador." };
  const avatarValue = formData.get("avatar_file");
  const file = avatarValue instanceof File && avatarValue.size > 0 ? avatarValue : null;
  const removePhoto = formData.get("remove_photo") === "true";
  let path: string | null = null;
  let photoUrl: string | null | undefined;
  if (file && removePhoto) return { error: "Elige si quieres cambiar la foto o quitarla." };
  if (file) {
    try {
      await validateAvatarImageFile(file);
      const normalized = await sharp(Buffer.from(await file.arrayBuffer()), {
        limitInputPixels: 40_000_000,
      })
        .rotate()
        .resize(512, 512, { fit: "cover", position: "centre" })
        .jpeg({ quality: 88 })
        .toBuffer();
      path = `${profile.id}/${randomUUID()}.jpg`;
      const { error } = await admin.storage.from("avatars").upload(path, normalized, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) throw error;
      photoUrl = admin.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    } catch {
      if (path)
        await admin.storage
          .from("avatars")
          .remove([path])
          .catch(() => undefined);
      return { error: "No pudimos preparar la foto. Usa un JPG o PNG de hasta 5 MB." };
    }
  } else if (removePhoto) photoUrl = null;
  const { cap_number, ...contact } = selfProfilePayload(parsed.data);
  let failed: string | null = null;
  try {
    const { data: saved, error } = await admin
      .from("profiles")
      .update({
        ...contact,
        ...(isPlayer && formData.has("cap_number") ? { cap_number } : {}),
        ...(photoUrl !== undefined ? { photo_url: photoUrl } : {}),
      })
      .eq("id", profile.id)
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .eq("updated_at", revision.data)
      .select("id")
      .maybeSingle();
    if (error || !saved) {
      failed = error
        ? "No pudimos confirmar el guardado. Vuelve a abrir tus datos para comprobarlo."
        : "Tus datos han cambiado en otra sesión. Vuelve a abrir la ficha para revisarlos.";
    }
  } catch {
    failed = "No pudimos confirmar el guardado. Vuelve a abrir tus datos para comprobarlo.";
  }
  if (failed && path) {
    try {
      const { data: current, error: verificationError } = await admin
        .from("profiles")
        .select("photo_url")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (!verificationError && current) {
        if (current.photo_url === photoUrl) failed = null;
        else {
          await admin.storage
            .from("avatars")
            .remove([path])
            .catch(() => undefined);
          failed = "No pudimos guardar. Tu foto anterior se conserva. Vuelve a intentarlo.";
        }
      } else
        failed = "No pudimos confirmar el guardado. Vuelve a abrir tus datos para comprobarlo.";
    } catch {
      failed = "No pudimos confirmar el guardado. Vuelve a abrir tus datos para comprobarlo.";
    }
  }
  if (failed) return { error: failed };
  if (photoUrl !== undefined && profile.photo_url) {
    try {
      const url = new URL(profile.photo_url);
      const base = new URL(
        admin.storage.from("avatars").getPublicUrl(`${profile.id}/`).data.publicUrl,
      );
      if (url.origin === base.origin && url.pathname.startsWith(base.pathname)) {
        const suffix = decodeURIComponent(url.pathname.slice(base.pathname.length));
        if (suffix && !suffix.includes("/") && !suffix.includes("..")) {
          const oldPath = `${profile.id}/${suffix}`;
          if (oldPath !== path) await admin.storage.from("avatars").remove([oldPath]);
        }
      }
    } catch {
      photoUrl = undefined;
    }
  }
  for (const route of ["/profile", "/dashboard", "/team", "/rankings"]) revalidatePath(route);
  return { ok: true };
}
