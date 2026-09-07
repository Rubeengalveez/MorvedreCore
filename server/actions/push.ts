"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getActiveProfileContext } from "@/server/queries/active-profile";

export async function getPushSubscriptionEnabled(endpoint: string): Promise<boolean> {
  const parsed = z.string().url().max(4096).safeParse(endpoint);
  if (!parsed.success) throw new Error("Suscripción no válida.");
  const ctx = await getActiveProfileContext();
  if (!ctx || !ctx.ownProfile.is_active)
    throw new Error("Inicia sesión para comprobar los avisos.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("enabled")
    .eq("profile_id", ctx.ownProfile.id)
    .eq("endpoint", parsed.data)
    .maybeSingle();
  if (error) throw new Error("No pudimos comprobar los avisos de esta cuenta.");
  return data?.enabled === true;
}
