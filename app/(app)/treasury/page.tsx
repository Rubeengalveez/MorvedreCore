import { redirect } from "next/navigation";
import { Banknote } from "lucide-react";

import { AppPageHero } from "@/components/ui/app-page-hero";
import { PageShell } from "@/components/ui/page-shell";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getFamilyTreasury } from "@/server/queries/treasury";
import { FamilyTreasuryView } from "./_components/family-treasury-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Tesoreria - Morvedre Core",
};

export default async function TreasuryPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const data = await getFamilyTreasury(ctx.ownProfile.id);
  if (!data.canView) redirect("/profile");

  return (
    <PageShell width="md" className="gap-5 pb-8">
      <AppPageHero
        eyebrow="Tesorería"
        title="Lo que pagas este mes"
        description="Cuotas, descuentos y pedidos de tienda, desglosados de forma simple."
        icon={<Banknote className="h-6 w-6" aria-hidden="true" />}
      />
      <FamilyTreasuryView data={data} />
    </PageShell>
  );
}
