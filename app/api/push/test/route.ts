import { NextResponse } from "next/server";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { sendPushToProfile } from "@/lib/push/service";

export const dynamic = "force-dynamic";

export async function POST() {
  const ctx = await getActiveProfileContext();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const result = await sendPushToProfile(ctx.ownProfile.id, {
    title: "Morvedre Core",
    body: "Las notificaciones push estan activas en este dispositivo.",
    href: "/notifications",
  });

  return NextResponse.json({ ok: true, ...result });
}
