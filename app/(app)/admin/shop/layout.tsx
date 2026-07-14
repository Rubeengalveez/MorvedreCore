import { AdminPermissionLayout } from "@/components/admin/admin-permission-layout";

export default function ShopAdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminPermissionLayout permission="manage_shop">{children}</AdminPermissionLayout>;
}
