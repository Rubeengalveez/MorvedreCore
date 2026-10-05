"use server";

import { z } from "zod";
import { NOTIFICATION_TOPICS } from "@/lib/domain/notifications";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type NotificationRow = Tables<"notifications">;

function throwIfError(error: { message: string } | null, fallback: string): void {
  if (error) {
    throw new Error(fallback);
  }
}

async function loadCurrentUserProfile(): Promise<{ id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No has iniciado sesión.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, is_active")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  throwIfError(profileError, "No pudimos verificar tu identidad.");
  if (!profile?.is_active) {
    throw new Error("Tu perfil no está configurado.");
  }

  return { id: profile.id };
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const id = z.uuid().parse(notificationId);
  const me = await loadCurrentUserProfile();

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_id", me.id)
    .is("read_at", null);

  throwIfError(error, "No pudimos marcar la notificación como leída.");

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
}

export async function markAllNotificationsRead(): Promise<void> {
  const me = await loadCurrentUserProfile();

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", me.id)
    .is("read_at", null);

  throwIfError(error, "No pudimos marcar las notificaciones como leídas.");

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  revalidatePath("/calendar");
}

export async function getUnreadCount(): Promise<number> {
  const me = await loadCurrentUserProfile();

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", me.id)
    .is("read_at", null);

  throwIfError(error, "No pudimos contar las notificaciones.");
  return count ?? 0;
}

export async function setNotificationPreference(input: {
  topic: string;
  enabled: boolean;
}): Promise<void> {
  const schema = z.object({
    topic: z.enum(NOTIFICATION_TOPICS.map((topic) => topic.id)),
    enabled: z.boolean(),
  });
  const parsed = schema.parse(input);
  const me = await loadCurrentUserProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profile_notification_prefs")
    .upsert(
      { profile_id: me.id, notification_type: parsed.topic, enabled: parsed.enabled },
      { onConflict: "profile_id,notification_type" },
    );
  throwIfError(error, "No pudimos guardar esta preferencia. Vuelve a intentarlo.");
  revalidatePath("/notifications");
}
