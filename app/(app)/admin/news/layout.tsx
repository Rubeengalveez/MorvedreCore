import { AdminPermissionLayout } from "@/components/admin/admin-permission-layout";

export default function NewsAdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminPermissionLayout permission="manage_news">{children}</AdminPermissionLayout>;
}
