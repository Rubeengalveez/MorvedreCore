import { isAllowedPushEndpoint, pushRequestIsSameOrigin } from "@/lib/domain/push-subscription";
import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getActiveProfileContext } from "@/server/queries/active-profile";

export const dynamic = "force-dynamic";

const schema = z.object({
  endpoint: z.string().url().max(4096).refine(isAllowedPushEndpoint),
});

export async function POST(request: Request) {
  if (!pushRequestIsSameOrigin(request))
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const ctx = await getActiveProfileContext();
  if (!ctx?.ownProfile.is_active)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Suscripcion invalida" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await (
    supabase as unknown as {
      from: (table: "push_subscriptions") => {
        update: (value: unknown) => {
          eq: (
            column: string,
            value: string,
          ) => {
            eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
    }
  )
    .from("push_subscriptions")
    .update({ enabled: false })
    .eq("profile_id", ctx.ownProfile.id)
    .eq("endpoint", parsed.data.endpoint);

  if (error)
    return NextResponse.json(
      { error: "No pudimos guardar los avisos de este dispositivo." },
      { status: 500 },
    );
  return NextResponse.json({ ok: true });
}
