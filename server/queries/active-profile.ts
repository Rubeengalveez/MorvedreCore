import { cache } from "react";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { ACTIVE_COOKIE, type ProfileSummary } from "./profile-types";

export { ACTIVE_COOKIE };
export type { ProfileSummary } from "./profile-types";

export interface ActiveProfileContext {
  ownProfile: ProfileSummary;
  activeProfile: ProfileSummary;
  linkedProfiles: ProfileSummary[];
}

function extractJoined<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

function isProfileRow(value: unknown): value is ProfileSummary {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.full_name === "string";
}

type ParentChildProfileRow = {
  profiles: ProfileSummary | ProfileSummary[] | null;
};

const PROFILE_SELECT =
  "id, full_name, photo_url, birth_year, cap_number, team_color, must_change_password, calendar_token";

const PROFILE_SELECT_FALLBACK =
  "id, full_name, photo_url, birth_year, cap_number, team_color, must_change_password";

export const getActiveProfileContext = cache(async (): Promise<ActiveProfileContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  let own: ProfileSummary | null = null;
  const { data: ownData, error: ownError } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (ownData) {
    own = ownData;
  } else if (ownError) {
    const isMissingCol = ownError.message.includes("calendar_token") || ownError.message.includes("does not exist");
    if (isMissingCol) {
      console.warn("⚠️ ALERTA: La columna calendar_token no existe en profiles. Ejecuta 'pnpm supabase db push'.");
      const { data: fallbackOwn } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT_FALLBACK)
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (fallbackOwn) {
        own = {
          ...fallbackOwn,
          calendar_token: "",
        };
      }
    }
  }

  if (!own) return null;

  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_COOKIE)?.value ?? null;

  let active: ProfileSummary = own;
  if (activeId && activeId !== own.id) {
    const { data: link, error: linkError } = await supabase
      .from("parent_child_links")
      .select(`profiles!parent_child_links_child_profile_id_fkey(${PROFILE_SELECT})`)
      .eq("parent_profile_id", own.id)
      .eq("child_profile_id", activeId)
      .maybeSingle();

    let child = extractJoined(link?.profiles);
    if (linkError && (linkError.message.includes("calendar_token") || linkError.message.includes("does not exist"))) {
      const { data: fallbackLink } = await supabase
        .from("parent_child_links")
        .select(`profiles!parent_child_links_child_profile_id_fkey(${PROFILE_SELECT_FALLBACK})`)
        .eq("parent_profile_id", own.id)
        .eq("child_profile_id", activeId)
        .maybeSingle();
      
      const rawChild = extractJoined(fallbackLink?.profiles);
      if (rawChild) {
        child = {
          ...rawChild,
          calendar_token: "",
        };
      }
    }

    if (isProfileRow(child)) {
      active = child;
    }
  }

  const { data: linkRows, error: rowsError } = await supabase
    .from("parent_child_links")
    .select(`profiles!parent_child_links_child_profile_id_fkey(${PROFILE_SELECT})`)
    .eq("parent_profile_id", own.id);

  let finalRows = linkRows as ParentChildProfileRow[] | null;
  if (rowsError && (rowsError.message.includes("calendar_token") || rowsError.message.includes("does not exist"))) {
    const { data: fallbackRows } = await supabase
      .from("parent_child_links")
      .select(`profiles!parent_child_links_child_profile_id_fkey(${PROFILE_SELECT_FALLBACK})`)
      .eq("parent_profile_id", own.id);
    
    if (fallbackRows) {
      finalRows = fallbackRows.map((row) => {
        const rawChild = extractJoined(row.profiles);
        return {
          profiles: rawChild ? { ...rawChild, calendar_token: "" } : null
        };
      });
    }
  }

  const linked: ProfileSummary[] = [];
  for (const row of finalRows ?? []) {
    const child = extractJoined(row.profiles);
    if (isProfileRow(child)) {
      linked.push(child);
    }
  }

  return { ownProfile: own, activeProfile: active, linkedProfiles: linked };
});
