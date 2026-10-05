import { redirect } from "next/navigation";
import { PageShell } from "@/components/ui/page-shell";
import { PageBackLink } from "@/components/ui/page-back-link";
import { FamilyOverviewPanel } from "@/components/profile/family-overview";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getCurrentSeason } from "@/server/queries/seasons";
import { getFamilyOverview } from "@/server/queries/family";
import { getFamilyTreasury } from "@/server/queries/treasury";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mi familia — Morvedre Core" };
export default async function ProfileFamilyPage() {
  const [ctx, season] = await Promise.all([getActiveProfileContext(), getCurrentSeason()]);
  if (!ctx?.ownProfile.is_active) redirect("/login");
  const [family, treasury] = await Promise.all([
    season ? getFamilyOverview(ctx.ownProfile.id, season.id) : null,
    getFamilyTreasury(ctx.ownProfile.id),
  ]);
  return (
    <PageShell width="md" className="gap-3 pb-5">
      <PageBackLink href="/profile">Mi perfil</PageBackLink>
      <h1 className="text-pool-deep text-3xl font-extrabold">Mi familia</h1>
      {family?.members.length ? (
        <FamilyOverviewPanel family={family} pendingTreasuryCents={treasury.totalPendingCents} />
      ) : (
        <div className="border-pool-deep/65 text-pool-deep rounded-2xl border-2 bg-white p-5">
          <h2 className="text-lg font-extrabold">No hay hijos vinculados</h2>
          <p className="mt-1 font-medium">El club gestiona los vínculos familiares.</p>
        </div>
      )}
    </PageShell>
  );
}
