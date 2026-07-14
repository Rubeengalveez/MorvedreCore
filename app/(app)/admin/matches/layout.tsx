import { AdminPermissionLayout } from "@/components/admin/admin-permission-layout";

export default function MatchesAdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminPermissionLayout permission="manage_matches">{children}</AdminPermissionLayout>;
}
