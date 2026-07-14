"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";

import { updateProfileSchema } from "@/lib/domain/admin-schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { normalizeSpanishPhone } from "@/lib/domain/phone";
import { validateAvatarImageFile } from "@/lib/uploads/images";

export type UpdateProfileState = { ok?: true; error?: string } | null;

export async function updateProfile(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const rawPhone = String(formData.get("phone_e164") ?? "");
  const parsed = updateProfileSchema.safeParse({
    full_name: formData.get("full_name"),
    birth_year: formData.get("birth_year"),
    cap_number: formData.get("cap_number"),
    phone_e164: rawPhone ? (normalizeSpanishPhone(rawPhone) ?? rawPhone) : "",
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

  const admin = createAdminClient();
  const { data: currentProfile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (profileError || !currentProfile) {
    return { error: "No pudimos localizar tu perfil." };
  }

  const avatarValue = formData.get("avatar_file");
  const avatarFile = avatarValue instanceof File && avatarValue.size > 0 ? avatarValue : null;
  const removePhoto = formData.get("remove_photo") === "true";
  let photoUrl: string | null | undefined;

  if (avatarFile) {
    try {
      await validateAvatarImageFile(avatarFile);
      const normalized = await sharp(Buffer.from(await avatarFile.arrayBuffer()), {
        limitInputPixels: 40_000_000,
      })
        .rotate()
        .resize(512, 512, { fit: "cover", position: "centre" })
        .jpeg({ quality: 88, mozjpeg: true })
        .toBuffer();
      const path = `${currentProfile.id}/avatar.jpg`;
      const { error: uploadError } = await admin.storage.from("avatars").upload(path, normalized, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
        upsert: true,
      });
      if (uploadError) throw uploadError;
      const { data } = admin.storage.from("avatars").getPublicUrl(path);
      photoUrl = `${data.publicUrl}?v=${Date.now()}`;
    } catch {
      return { error: "No pudimos preparar la foto. Usa un JPG o PNG de hasta 5 MB." };
    }
  } else if (removePhoto) {
    await admin.storage.from("avatars").remove([`${currentProfile.id}/avatar.jpg`]);
    photoUrl = null;
  }

  const { error } = await admin
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      photo_url: photoUrl,
      birth_year: parsed.data.birth_year,
      cap_number: parsed.data.cap_number,
      phone_e164: parsed.data.phone_e164,
      email_contact: parsed.data.email_contact,
    })
    .eq("auth_user_id", user.id);

  if (error) {
    return { error: "No pudimos guardar los cambios. Inténtalo de nuevo." };
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/team");
  revalidatePath("/rankings");

  return { ok: true };
}
