import { redirect } from "next/navigation";

import type { AdminPermission } from "@/lib/domain/permissions";
import { getAdminAccess, requireAdmin } from "@/server/actions/admin/_helpers";

export async function AdminPermissionLayout({
  permission,
  allowCoach = false,
  children,
}: {
  permission: AdminPermission;
  allowCoach?: boolean;
  children: React.ReactNode;
}) {
  const access = await getAdminAccess().catch(() => null);
  const allowed =
    access !== null &&
    (access.isAdmin ||
      access.permissions.has(permission) ||
      (allowCoach && access.coachTeamIds.size > 0));
  if (!allowed) redirect("/admin");
  return children;
}

export async function AdminOnlyLayout({ children }: { children: React.ReactNode }) {
  const allowed = await requireAdmin().then(
    () => true,
    () => false,
  );
  if (!allowed) redirect("/admin");
  return children;
}
