import { redirect } from "next/navigation";

import { PageBackLink } from "@/components/ui/page-back-link";
import { PageShell } from "@/components/ui/page-shell";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getFamilyTreasury } from "@/server/queries/treasury";
import { FamilyTreasuryView } from "./_components/family-treasury-view";
import { notificationBackTarget } from "@/lib/domain/notifications";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Tesoreria - Morvedre Core",
};

export default async function TreasuryPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; notificationId?: string }>;
}) {
  const params = await searchParams;
  const origin = params.from === "family";
  const notification = notificationBackTarget(params.from, params.notificationId);
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const data = await getFamilyTreasury(ctx.ownProfile.id);
  if (!data.canView) redirect("/profile");

  return (
    <PageShell width="md" className="gap-4 pb-8">
      <PageBackLink
        href={
          (notification?.href ?? (origin ? "/profile/family" : "/profile")) as import("next").Route
        }
      >
        {notification?.label ?? (origin ? "Mi familia" : "Mi perfil")}
      </PageBackLink>
      <h1 className="text-pool-deep text-3xl font-extrabold">Cuotas y pagos</h1>
      <FamilyTreasuryView data={data} isParent={ctx.linkedProfiles.length > 0} />
    </PageShell>
  );
}
