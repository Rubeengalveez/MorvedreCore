export type { Database, Tables, Enums } from "@/types/database";

export type DatabaseTableName = keyof import("@/types/database").Database["public"]["Tables"];

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type TypedSupabaseClient = SupabaseClient<Database>;
