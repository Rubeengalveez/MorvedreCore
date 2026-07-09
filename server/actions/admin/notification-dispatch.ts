import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToProfiles } from "@/lib/push/service";

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

  after(async () => {
    try {
      await sendPushToProfiles(
        list.map((row) => row.recipient_id),
        {
          title: list.length === 1 ? list[0].title : "Morvedre Core",
          body: list.length === 1 ? (list[0].body ?? "") : `${list.length} avisos nuevos`,
          href: list.length === 1 ? (list[0].href ?? "/notifications") : "/notifications",
        },
      );
    } catch (pushErr) {
      console.error("Async push notifications dispatch failed:", pushErr);
    }
  });

  return { error: null };
}
