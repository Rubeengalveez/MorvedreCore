import { AdminHomeMenu } from "@/components/admin/admin-home-menu";
import { PageShell } from "@/components/ui/page-shell";
import { getRenderAdminAccess } from "@/server/actions/admin/_helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Administración — Morvedre Core",
};

export default async function AdminHomePage() {
  const access = await getRenderAdminAccess();

  return (
    <PageShell width="md" className="gap-5">
      <header>
        <h1 className="text-pool-deep text-3xl leading-tight font-extrabold">Administración</h1>
      </header>
      <AdminHomeMenu access={access} />
    </PageShell>
  );
}
