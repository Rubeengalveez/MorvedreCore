import { redirect } from "next/navigation";
import { PageShell } from "@/components/ui/page-shell";
import { HomeDashboard } from "@/components/dashboard/home-dashboard";
import { getDashboardHome } from "@/server/queries/dashboard-home";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {
  title: "Inicio — Morvedre Core",
  description: "Tu día en el Waterpolo Morvedre: actividad, avisos y novedades del club.",
};

export default async function DashboardPage() {
  const data = await getDashboardHome();
  if (!data) redirect("/login");
  return (
    <PageShell width="md" className="gap-5 pb-8">
      <HomeDashboard data={data} />
    </PageShell>
  );
}
