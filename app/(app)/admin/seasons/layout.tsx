import { AdminOnlyLayout } from "@/components/admin/admin-permission-layout";

export default function SeasonsAdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminOnlyLayout>{children}</AdminOnlyLayout>;
}
