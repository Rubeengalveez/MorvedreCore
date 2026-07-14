import { AdminPermissionLayout } from "@/components/admin/admin-permission-layout";

export default function TreasuryAdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminPermissionLayout permission="manage_treasury">{children}</AdminPermissionLayout>;
}
