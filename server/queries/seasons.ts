import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database, Tables } from "@/types/database";

export type Season = Tables<"seasons">;

export const getCurrentSeason = cache(
  async (client?: SupabaseClient<Database>): Promise<Season | null> => {
    const supabase = client ?? (await createClient());
    const { data, error } = await supabase
      .from("seasons")
      .select("*")
      .eq("is_current", true)
      .maybeSingle();

    if (error) {
      throw new Error("No pudimos cargar la temporada actual.");
    }

    return data;
  },
);
