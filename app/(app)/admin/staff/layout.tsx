import { AdminPermissionLayout } from "@/components/admin/admin-permission-layout";

export default function StaffAdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminPermissionLayout permission="manage_staff">{children}</AdminPermissionLayout>;
}
