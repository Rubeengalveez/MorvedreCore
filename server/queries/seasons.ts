import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database, Tables } from "@/types/database";

export type Season = Tables<"seasons">;

export const getSeasonCategoryYear = cache(
  async (seasonId: string, client?: SupabaseClient<Database>): Promise<number> => {
    const supabase = client ?? (await createClient());
    const { data, error } = await supabase
      .from("seasons")
      .select("start_date")
      .eq("id", seasonId)
      .maybeSingle();
    if (error || !data)
      throw new Error("No pudimos comprobar la temporada para calcular la categoría.");
    return Number(data.start_date.slice(0, 4));
  },
);

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
