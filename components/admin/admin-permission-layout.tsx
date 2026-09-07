import { redirect } from "next/navigation";

import { canAccessAdminModule, type AdminPermission } from "@/lib/domain/permissions";
import { getRenderAdminAccess, requireAdmin } from "@/server/actions/admin/_helpers";

export async function AdminPermissionLayout({
  permission,
  children,
}: {
  permission: AdminPermission;
  children: React.ReactNode;
}) {
  const access = await getRenderAdminAccess();
  const allowed = canAccessAdminModule(access, permission);
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
