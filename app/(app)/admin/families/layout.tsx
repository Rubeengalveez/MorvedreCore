import { AdminPermissionLayout } from "@/components/admin/admin-permission-layout";

export default function FamiliesAdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminPermissionLayout permission="manage_families">{children}</AdminPermissionLayout>;
}
