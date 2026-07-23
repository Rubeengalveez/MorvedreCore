import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft, Banknote } from "lucide-react";

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
      <Link
        href={"/profile" as Route}
        className="text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue -ml-2 inline-flex min-h-12 items-center gap-2 self-start rounded-xl px-2 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        Volver al perfil
      </Link>
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
