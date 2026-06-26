import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { AppShell } from "@/components/layout/app-shell";
import type { ProfileSummary } from "@/components/layout/profile-switcher";
import { createClient } from "@/lib/supabase/server";

const ACTIVE_COOKIE = "morvedre_active_profile_id";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, photo_url, birth_year, gender, cap_number, license_active, phone_e164, email_contact, notes, must_change_password, auth_user_id, created_at, updated_at",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/login");
  }

  const pathname = (await headers()).get("x-pathname");
  if (profile.must_change_password && pathname !== "/change-password") {
    redirect("/change-password" as Route);
  }

  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_COOKIE)?.value ?? null;

  let activeProfile: ProfileSummary = {
    id: profile.id,
    full_name: profile.full_name,
    photo_url: profile.photo_url,
  };

  if (activeId && activeId !== profile.id) {
    const { data: link } = await supabase
      .from("parent_child_links")
      .select("child_profile_id, profiles!parent_child_links_child_profile_id_fkey(id, full_name, photo_url)")
      .eq("parent_profile_id", profile.id)
      .eq("child_profile_id", activeId)
      .maybeSingle();

    if (link) {
      const child = Array.isArray(link.profiles) ? link.profiles[0] : link.profiles;
      if (child && typeof child === "object" && "id" in child) {
        const c = child as { id: string; full_name: string; photo_url: string | null };
        activeProfile = {
          id: c.id,
          full_name: c.full_name,
          photo_url: c.photo_url,
        };
      }
    }
  }

  const { data: linkRows } = await supabase
    .from("parent_child_links")
    .select("child_profile_id, profiles!parent_child_links_child_profile_id_fkey(id, full_name, photo_url)")
    .eq("parent_profile_id", profile.id);

  const linkedProfiles: ProfileSummary[] = [];
  for (const row of linkRows ?? []) {
    const child = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    if (child && typeof child === "object" && "id" in child) {
      const c = child as { id: string; full_name: string; photo_url: string | null };
      linkedProfiles.push({
        id: c.id,
        full_name: c.full_name,
        photo_url: c.photo_url,
      });
    }
  }

  return (
    <AppShell activeProfile={activeProfile} linkedProfiles={linkedProfiles}>
      {children}
    </AppShell>
  );
}
