import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Season = Tables<"seasons", "Row">;

export const getCurrentSeason = cache(async (): Promise<Season | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_current", true)
    .maybeSingle();

  if (error) {
    throw new Error("No pudimos cargar la temporada actual.");
  }

  return data;
});
