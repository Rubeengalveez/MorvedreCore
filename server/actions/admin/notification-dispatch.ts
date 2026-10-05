import { scheduleNotificationPush } from "@/server/notification-push";
import { createAdminClient } from "@/lib/supabase/admin";

export interface NotificationInsert {
  recipient_id: string;
  kind: string;
  title: string;
  body?: string | null;
  href?: string | null;
  related_match_id?: string | null;
  related_training_session_id?: string | null;
}

export async function insertNotificationsWithPush(
  rows: NotificationInsert | NotificationInsert[],
): Promise<{ error: { message: string } | null }> {
  const list = Array.isArray(rows) ? rows : [rows];
  if (list.length === 0) return { error: null };

  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert(list);
  if (error) return { error };

  scheduleNotificationPush();

  return { error: null };
}
