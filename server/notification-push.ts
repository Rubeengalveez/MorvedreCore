import "server-only";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificationPushPayload } from "@/lib/domain/notifications";
import { sendPushToSubscription } from "@/lib/push/service";

interface PushJob {
  job_id: string;
  notification: {
    id: string;
    kind: string;
    title: string;
    body: string | null;
    created_at: string;
  };
  subscription: { id: string; endpoint: string; p256dh: string; auth: string };
  muted: boolean;
}

export async function dispatchNotificationPush() {
  const admin = createAdminClient() as SupabaseClient;
  let completed = 0;
  for (let batch = 0; batch < 5; batch++) {
    const { data, error } = await admin.rpc("claim_notification_push", { p_limit: 40 });
    if (error) throw new Error("No pudimos recuperar los avisos pendientes.");
    const jobs = (data ?? []) as PushJob[];
    if (!jobs.length) break;
    for (let offset = 0; offset < jobs.length; offset += 8) {
      await Promise.all(
        jobs.slice(offset, offset + 8).map(async (job) => {
          const result = job.muted
            ? { success: false, retryable: false }
            : await sendPushToSubscription(
                job.subscription,
                notificationPushPayload(job.notification),
              );
          const { data: current, error: currentError } = await admin
            .from("notification_push_deliveries")
            .select("attempts")
            .eq("id", job.job_id)
            .single();
          if (currentError) throw new Error("No pudimos comprobar la entrega del aviso.");
          const retry = !job.muted && !result.success && result.retryable && current.attempts < 5;
          const { error: updateError } = await admin
            .from("notification_push_deliveries")
            .update({
              status: job.muted
                ? "skipped"
                : result.success
                  ? "sent"
                  : retry
                    ? "pending"
                    : "failed",
              finished_at: retry ? null : new Date().toISOString(),
              available_at: new Date(
                Date.now() + Math.min(3600000, 60000 * 2 ** current.attempts),
              ).toISOString(),
              last_error: !job.muted && "error" in result ? result.error?.slice(0, 200) : null,
            })
            .eq("id", job.job_id)
            .eq("status", "processing");
          if (updateError) throw new Error("No pudimos guardar la entrega del aviso.");
          completed++;
        }),
      );
    }
    if (jobs.length < 40) break;
  }
  return { completed };
}

export function scheduleNotificationPush() {
  after(async () => {
    try {
      await dispatchNotificationPush();
    } catch {
      console.error("No se pudo completar la entrega de avisos. Se reintentará desde la cola.");
    }
  });
}
