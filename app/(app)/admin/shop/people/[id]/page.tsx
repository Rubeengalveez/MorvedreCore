import { notFound } from "next/navigation";
import { z } from "zod";
import { AdminPageShell } from "@/components/admin/admin-page";
import { getShopFamilyHistory } from "@/server/queries/admin-shop";
import { safeShopReturn } from "@/lib/domain/shop-management";
import { ShopFamilyHistory } from "../../_components/shop-family-history";

export const dynamic = "force-dynamic";
export const metadata = { title: "Historial de pedidos — Morvedre Core" };

export default async function ShopPersonHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [{ returnTo }, family] = await Promise.all([searchParams, getShopFamilyHistory(id)]);
  if (!family.members.some((member) => member.id === id)) notFound();
  return (
    <AdminPageShell width="lg">
      <ShopFamilyHistory family={family} returnTo={safeShopReturn(returnTo)} />
    </AdminPageShell>
  );
}
