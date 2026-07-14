import { AdminPermissionLayout } from "@/components/admin/admin-permission-layout";

export default function TeamsAdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminPermissionLayout permission="manage_teams">{children}</AdminPermissionLayout>;
}
