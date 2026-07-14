import { AdminPermissionLayout } from "@/components/admin/admin-permission-layout";

export default function PlayersAdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminPermissionLayout permission="manage_players">{children}</AdminPermissionLayout>;
}
