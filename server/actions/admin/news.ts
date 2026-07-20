"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { insertNotificationsWithPush } from "./notification-dispatch";
import { requirePermission } from "./_helpers";
import {
  createNewsPostSchema,
  deleteNewsPostSchema,
  reactNewsSchema,
  togglePinNewsSchema,
  updateNewsPostSchema,
} from "@/lib/domain/admin-schemas";
import { isExpired, isValidReaction, NEWS_LIMITS } from "@/lib/domain/news";
import { validateImageFile } from "@/lib/uploads/images";

function toError(e: unknown): string {
  if (e instanceof z.ZodError) return e.issues[0]?.message ?? "Datos inválidos.";
  if (e instanceof Error) return e.message;
  return "Ha habido un problema.";
}

async function uploadNewsImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  postId: string,
  file: File,
): Promise<string> {
  const image = await validateImageFile(file);
  const path = `news/${postId}/${Date.now()}.${image.extension}`;
  const { error } = await supabase.storage
    .from("news")
    .upload(path, file, { contentType: image.contentType, upsert: true });
  if (error) throw new Error("No pudimos subir la imagen: " + error.message);
  const { data: pub } = supabase.storage.from("news").getPublicUrl(path);
  return pub.publicUrl;
}

export async function createNewsPost(input: {
  title: string;
  body_md: string;
  image_url?: string | null;
  audience: "club" | "team";
  audience_team_id?: string | null;
  pinned?: boolean;
  expires_at?: string | null;
  imageFile?: File | null;
}): Promise<{ id: string }> {
  const author = await requirePermission("manage_news");
  const parsed = createNewsPostSchema.safeParse({
    title: input.title,
    body_md: input.body_md,
    image_url: input.image_url ?? null,
    audience: input.audience,
    audience_team_id: input.audience_team_id ?? null,
    pinned: input.pinned ?? false,
    expires_at: input.expires_at ?? null,
  });
  if (!parsed.success) throw new Error(toError(parsed.error));

  if (parsed.data.body_md.length > NEWS_LIMITS.MAX_BODY) {
    throw new Error("El cuerpo es demasiado largo.");
  }
  if (parsed.data.expires_at != null) {
    const d = new Date(parsed.data.expires_at);
    if (Number.isNaN(d.getTime()) || d.getTime() < Date.now() - 1000 * 60) {
      throw new Error("La caducidad debe ser en el futuro.");
    }
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: created, error } = await admin
    .from("news_posts")
    .insert({
      author_id: author.id,
      title: parsed.data.title,
      body_md: parsed.data.body_md,
      image_url: parsed.data.image_url,
      audience: parsed.data.audience,
      audience_team_id: parsed.data.audience_team_id,
      pinned: parsed.data.pinned,
      expires_at: parsed.data.expires_at,
    })
    .select("id")
    .single();
  if (error) throw new Error("No pudimos crear la noticia: " + error.message);

  if (input.imageFile) {
    const url = await uploadNewsImage(supabase, created.id, input.imageFile);
    await admin.from("news_posts").update({ image_url: url }).eq("id", created.id);
  }

  await notifyAllMembersOnNews(
    parsed.data.audience,
    parsed.data.audience_team_id,
    created.id,
    parsed.data.title,
  );
  revalidatePath("/news");
  revalidatePath("/admin/news");
  revalidatePath("/dashboard");
  return { id: created.id };
}

export async function updateNewsPost(input: {
  post_id: string;
  title: string;
  body_md: string;
  image_url?: string | null;
  audience: "club" | "team";
  audience_team_id?: string | null;
  pinned?: boolean;
  expires_at?: string | null;
  imageFile?: File | null;
}): Promise<void> {
  await requirePermission("manage_news");
  const parsed = updateNewsPostSchema.safeParse({
    post_id: input.post_id,
    title: input.title,
    body_md: input.body_md,
    image_url: input.image_url ?? null,
    audience: input.audience,
    audience_team_id: input.audience_team_id ?? null,
    pinned: input.pinned ?? false,
    expires_at: input.expires_at ?? null,
  });
  if (!parsed.success) throw new Error(toError(parsed.error));

  const supabase = await createClient();
  const admin = createAdminClient();

  let imageUrl = parsed.data.image_url;
  if (input.imageFile) {
    imageUrl = await uploadNewsImage(supabase, input.post_id, input.imageFile);
  }

  const { error } = await admin
    .from("news_posts")
    .update({
      title: parsed.data.title,
      body_md: parsed.data.body_md,
      image_url: imageUrl,
      audience: parsed.data.audience,
      audience_team_id: parsed.data.audience_team_id,
      pinned: parsed.data.pinned,
      expires_at: parsed.data.expires_at ?? null,
    })
    .eq("id", input.post_id);
  if (error) throw new Error("No pudimos actualizar la noticia: " + error.message);

  revalidatePath("/news");
  revalidatePath(`/news/${input.post_id}`);
  revalidatePath("/admin/news");
}

export async function deleteNewsPost(input: { post_id: string }): Promise<void> {
  await requirePermission("manage_news");
  const parsed = deleteNewsPostSchema.safeParse(input);
  if (!parsed.success) throw new Error(toError(parsed.error));
  const admin = createAdminClient();
  const { error } = await admin.from("news_posts").delete().eq("id", input.post_id);
  if (error) throw new Error("No pudimos eliminar la noticia: " + error.message);
  revalidatePath("/news");
  revalidatePath("/admin/news");
}

export async function togglePinNews(input: { post_id: string; pinned: boolean }): Promise<void> {
  await requirePermission("manage_news");
  const parsed = togglePinNewsSchema.safeParse(input);
  if (!parsed.success) throw new Error(toError(parsed.error));
  const admin = createAdminClient();
  const { error } = await admin
    .from("news_posts")
    .update({ pinned: parsed.data.pinned })
    .eq("id", input.post_id);
  if (error) throw new Error("No pudimos pinear la noticia: " + error.message);
  revalidatePath("/news");
  revalidatePath("/admin/news");
}

export async function reactToNews(input: {
  post_id: string;
  reaction: "like" | "fire" | "thanks";
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user: me },
  } = await supabase.auth.getUser();
  if (!me) throw new Error("No has iniciado sesión.");
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", me.id)
    .maybeSingle();
  if (!profile) throw new Error("Tu perfil no está configurado.");

  const parsed = reactNewsSchema.safeParse(input);
  if (!parsed.success) throw new Error(toError(parsed.error));
  if (!isValidReaction(parsed.data.reaction)) throw new Error("Reacción inválida.");

  const { data: post } = await supabase
    .from("news_posts")
    .select("id, expires_at")
    .eq("id", input.post_id)
    .maybeSingle();
  if (!post) throw new Error("La noticia no existe.");
  if (isExpired((post as { expires_at: string | null }).expires_at)) {
    throw new Error("La noticia ha caducado.");
  }

  const { data: existing } = await supabase
    .from("news_reactions")
    .select("id")
    .eq("post_id", input.post_id)
    .eq("profile_id", profile.id)
    .eq("reaction", parsed.data.reaction)
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from("news_reactions")
      .delete()
      .eq("id", (existing as { id: string }).id);
    if (error) throw new Error("No pudimos quitar la reacción: " + error.message);
  } else {
    const { error } = await supabase.from("news_reactions").insert({
      post_id: input.post_id,
      profile_id: profile.id,
      reaction: parsed.data.reaction,
    });
    if (error) throw new Error("No pudimos guardar la reacción: " + error.message);
  }
  revalidatePath("/news");
  revalidatePath(`/news/${input.post_id}`);
}

async function notifyAllMembersOnNews(
  audience: "club" | "team",
  teamId: string | null | undefined,
  postId: string,
  title: string,
): Promise<void> {
  const supabase = await createClient();
  let profileIds: string[] = [];
  if (audience === "club") {
    const { data } = await supabase.from("profiles").select("id");
    profileIds = (data ?? []).map((p) => (p as { id: string }).id);
  } else if (audience === "team" && teamId != null) {
    const { data: rosters } = await supabase
      .from("team_rosters")
      .select("player_id")
      .eq("team_id", teamId)
      .is("left_at", null);
    const { data: staff } = await supabase
      .from("team_staff")
      .select("profile_id")
      .eq("team_id", teamId);
    profileIds = Array.from(
      new Set([
        ...(rosters ?? []).map((r) => (r as { player_id: string }).player_id),
        ...(staff ?? []).map((s) => (s as { profile_id: string }).profile_id),
      ]),
    );
  }
  if (profileIds.length === 0) return;
  const rows = profileIds.map((pid) => ({
    recipient_id: pid,
    kind: "news_pinned" as const,
    title: "Nueva noticia",
    body: title,
    href: `/news/${postId}`,
    related_match_id: null,
  }));
  await insertNotificationsWithPush(rows);
}
