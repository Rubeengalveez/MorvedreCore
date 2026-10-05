import { notificationTarget, notificationPreferences } from "@/lib/domain/notifications";
import { createClient } from "@/lib/supabase/server";

export interface NotificationItem {
  id: string;
  recipient_id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  read_at: string | null;
  related_match_id: string | null;
  related_profile_id: string | null;
  related_training_session_id: string | null;
  created_at: string;
}

export async function getNotificationsForProfile(
  recipientId: string,
  limit = 50,
): Promise<NotificationItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, recipient_id, kind, title, body, href, read_at, related_match_id, related_profile_id, related_training_session_id, created_at",
    )
    .eq("recipient_id", recipientId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error("No pudimos cargar las notificaciones.");
  }
  return ((data ?? []) as NotificationItem[]).map((item) => ({
    ...item,
    href: notificationTarget(item),
  }));
}

export async function getUnreadNotificationsCount(recipientId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", recipientId)
    .is("read_at", null);

  if (error) {
    throw new Error("No pudimos contar las notificaciones.");
  }
  return count ?? 0;
}

export async function getNotificationInbox(
  recipientId: string,
  view: "all" | "unread",
  page: number,
) {
  const supabase = await createClient();
  const size = 20;
  const base = () =>
    supabase.from("notifications").select("*", { count: "exact" }).eq("recipient_id", recipientId);
  const countQuery = base();
  const countResult = await (view === "unread" ? countQuery.is("read_at", null) : countQuery).limit(
    0,
  );
  if (countResult.error) throw new Error("No pudimos cargar tus avisos.");
  const total = countResult.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(1, page), pages);
  const query = base();
  const result = await (view === "unread" ? query.is("read_at", null) : query)
    .order("created_at", { ascending: false })
    .order("id")
    .range((current - 1) * size, current * size - 1);
  if (result.error) throw new Error("No pudimos cargar tus avisos.");
  return {
    items: ((result.data ?? []) as NotificationItem[]).map((item) => ({
      ...item,
      href: notificationTarget(item),
    })),
    total,
    pages,
    page: current,
  };
}

export async function getNotificationForProfile(recipientId: string, id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("id", id)
    .eq("recipient_id", recipientId)
    .maybeSingle();
  if (error) throw new Error("No pudimos cargar este aviso.");
  return data
    ? ({ ...data, href: notificationTarget(data as NotificationItem) } as NotificationItem)
    : null;
}

export async function getNotificationPreferences(profileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_notification_prefs")
    .select("notification_type, enabled")
    .eq("profile_id", profileId);
  if (error) throw new Error("No pudimos cargar tus preferencias.");
  return notificationPreferences(data ?? []);
}
