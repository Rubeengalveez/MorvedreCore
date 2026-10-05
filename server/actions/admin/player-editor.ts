"use server";

import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { createPlayerSchema, updatePlayerSchema } from "@/lib/domain/admin-schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateAvatarImageFile } from "@/lib/uploads/images";
import { requirePermission } from "./_helpers";
import { createPlayer, updatePlayer } from "./players";

export async function savePlayerWithPhoto(formData: FormData): Promise<void> {
  await requirePermission("manage_players");
  const id = String(formData.get("id") ?? "");
  if (id && !z.uuid().safeParse(id).success) throw new Error("Jugador inválido.");
  let raw: Record<string, unknown>;
  try {
    const value: unknown = JSON.parse(String(formData.get("input") ?? ""));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    raw = value as Record<string, unknown>;
  } catch {
    throw new Error("Revisa los datos de la ficha.");
  }
  const image = formData.get("photo");
  const file = image instanceof File && image.size > 0 ? image : null;
  if (formData.get("remove_photo") === "true") raw.photo_url = null;
  if (file) raw.photo_url = "https://example.com/pending-photo";
  if (!id) raw = Object.fromEntries(Object.entries(raw).filter(([, value]) => value != null));
  const parsed = id ? updatePlayerSchema.safeParse(raw) : createPlayerSchema.safeParse(raw);
  if (!parsed.success)
    throw new Error(parsed.error.issues[0]?.message ?? "Revisa los datos de la ficha.");
  if (!id && Number(raw.birth_year) > new Date().getFullYear())
    throw new Error("El año de nacimiento no puede ser futuro.");
  const db = createAdminClient();
  let path: string | null = null;
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
      path = `${id || "registered"}/${randomUUID()}.jpg`;
      const { error } = await db.storage.from("avatars").upload(path, normalized, {
        contentType: "image/jpeg",
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) throw error;
      raw.photo_url = db.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    } catch {
      throw new Error("No pudimos preparar la foto. Elige un JPG o PNG de hasta 5 MB.");
    }
  }
  try {
    if (id) await updatePlayer(id, updatePlayerSchema.parse(raw));
    else await createPlayer(createPlayerSchema.parse(raw));
  } catch (error) {
    if (path) await db.storage.from("avatars").remove([path]);
    throw error;
  }
}
