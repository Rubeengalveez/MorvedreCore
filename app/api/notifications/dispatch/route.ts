import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchNotificationPush } from "@/server/notification-push";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret = process.env.NOTIFICATION_DISPATCH_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "Entrega periódica pendiente de configurar." },
      { status: 503 },
    );
  const hash = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(hash(request.headers.get("authorization") ?? ""), hash(`Bearer ${secret}`)))
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  try {
    const admin = createAdminClient() as SupabaseClient;
    const { error } = await admin.rpc("create_match_notification_reminders");
    if (error) throw new Error("No pudimos preparar los recordatorios.");
    return NextResponse.json(await dispatchNotificationPush(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "No pudimos completar la entrega de avisos." },
      { status: 503 },
    );
  }
}
