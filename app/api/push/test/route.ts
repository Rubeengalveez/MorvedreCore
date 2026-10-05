import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { sendPushToSubscription } from "@/lib/push/service";
import { isAllowedPushEndpoint, pushRequestIsSameOrigin } from "@/lib/domain/push-subscription";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  if (!pushRequestIsSameOrigin(request))
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const ctx = await getActiveProfileContext();
  if (!ctx?.ownProfile.is_active)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = z
    .object({ endpoint: z.string().max(4096).refine(isAllowedPushEndpoint) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Suscripción no válida" }, { status: 400 });
  const supabase = await createClient();
  const { data: subscription, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("profile_id", ctx.ownProfile.id)
    .eq("endpoint", parsed.data.endpoint)
    .eq("enabled", true)
    .maybeSingle();
  if (error || !subscription)
    return NextResponse.json({ error: "Activa los avisos en este dispositivo." }, { status: 404 });
  const result = await sendPushToSubscription(subscription, {
    title: "Morvedre Core",
    body: "Los avisos están activados en este dispositivo.",
    href: "/notifications",
    tag: "morvedre-push-test",
    ttl: 60,
  });
  return NextResponse.json({ success: result.success }, { status: result.success ? 200 : 502 });
}
