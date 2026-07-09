import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getActiveProfileContext } from "@/server/queries/active-profile";

export const dynamic = "force-dynamic";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(10),
    auth: z.string().min(8),
  }),
});

export async function POST(request: Request) {
  const ctx = await getActiveProfileContext();
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Suscripcion invalida" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await (
    supabase as unknown as {
      from: (table: "push_subscriptions") => {
        upsert: (
          value: unknown,
          options: { onConflict: string },
        ) => Promise<{ error: { message: string } | null }>;
      };
    }
  )
    .from("push_subscriptions")
    .upsert(
      {
        profile_id: ctx.ownProfile.id,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        user_agent: request.headers.get("user-agent"),
        enabled: true,
        last_error: null,
      },
      { onConflict: "endpoint" },
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
