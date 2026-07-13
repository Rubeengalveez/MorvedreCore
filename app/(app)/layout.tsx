import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { hasCurrentAttendancePermission } from "@/server/queries/dashboard";
import { getCurrentSeason } from "@/server/queries/seasons";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");

  const pathname = (await headers()).get("x-pathname");
  if (ctx.ownProfile.must_change_password && pathname !== "/change-password") {
    redirect("/change-password" as Route);
  }

  const season = await getCurrentSeason();
  const showAttendance = season
    ? await hasCurrentAttendancePermission(ctx.activeProfile.id, season.id)
    : false;

  return (
    <AppShell
      ownProfile={ctx.ownProfile}
      activeProfile={ctx.activeProfile}
      linkedProfiles={ctx.linkedProfiles}
      showAttendance={showAttendance}
    >
      {children}
    </AppShell>
  );
}
