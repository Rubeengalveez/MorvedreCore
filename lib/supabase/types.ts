export type {
  Database,
  DatabaseTableName,
  Tables,
  Enums,
} from "@/types/database";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type TypedSupabaseClient = SupabaseClient<Database>;
