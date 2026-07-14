import { cache } from "react";
import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  "id, full_name, photo_url, birth_year, cap_number, team_color, must_change_password, calendar_token, is_active";

export const getActiveProfileContext = cache(async (): Promise<ActiveProfileContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = createAdminClient();
  const { data: own } = await admin
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!own) return null;

  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_COOKIE)?.value ?? null;

  let active: ProfileSummary = own;
  if (activeId && activeId !== own.id) {
    const { data: link } = await admin
      .from("parent_child_links")
      .select(`profiles!parent_child_links_child_profile_id_fkey(${PROFILE_SELECT})`)
      .eq("parent_profile_id", own.id)
      .eq("child_profile_id", activeId)
      .maybeSingle();

    const child = extractJoined(link?.profiles);

    if (isProfileRow(child) && child.is_active) {
      active = child;
    }
  }

  const { data: linkRows } = await admin
    .from("parent_child_links")
    .select(`profiles!parent_child_links_child_profile_id_fkey(${PROFILE_SELECT})`)
    .eq("parent_profile_id", own.id);

  const finalRows = linkRows as ParentChildProfileRow[] | null;

  const linked: ProfileSummary[] = [];
  for (const row of finalRows ?? []) {
    const child = extractJoined(row.profiles);
    if (isProfileRow(child) && child.is_active) {
      linked.push(child);
    }
  }

  return { ownProfile: own, activeProfile: active, linkedProfiles: linked };
});
