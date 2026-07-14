import { redirect } from "next/navigation";

import type { AdminPermission } from "@/lib/domain/permissions";
import { requireAdmin, requirePermission } from "@/server/actions/admin/_helpers";

export async function AdminPermissionLayout({
  permission,
  children,
}: {
  permission: AdminPermission;
  children: React.ReactNode;
}) {
  const allowed = await requirePermission(permission).then(
    () => true,
    () => false,
  );
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
