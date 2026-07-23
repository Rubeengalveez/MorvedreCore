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

function safeNotificationHref(item: NotificationItem): string | null {
  if (item.related_match_id) return `/matches/${item.related_match_id}`;
  if (item.kind === "training_cancelled") return "/calendar";
  if (!item.href?.startsWith("/")) return null;
  if (item.href.startsWith("/admin/matches/")) {
    return item.related_match_id ? `/matches/${item.related_match_id}` : "/calendar";
  }
  const allowed = [
    "/news/",
    "/matches/",
    "/shop/orders/",
    "/attendance/history",
    "/calendar",
    "/notifications",
  ];
  return allowed.some((prefix) => item.href?.startsWith(prefix)) ? item.href : null;
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
    href: safeNotificationHref(item),
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
