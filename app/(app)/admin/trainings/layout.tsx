import { AdminPermissionLayout } from "@/components/admin/admin-permission-layout";

export default function TrainingsAdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminPermissionLayout permission="manage_trainings">{children}</AdminPermissionLayout>;
}
