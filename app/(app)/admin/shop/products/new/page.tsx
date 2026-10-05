import { redirect } from "next/navigation";

import { AdminPageShell } from "@/components/admin/admin-page";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { requirePermission } from "@/server/actions/admin/_helpers";
import { ShopEditorForm } from "../../_components/shop-editor-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Nuevo producto — Morvedre Core",
};

export default async function NewShopProductPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  await requirePermission("manage_shop");

  return (
    <AdminPageShell className="gap-4">
      <ShopEditorForm mode="create" />
    </AdminPageShell>
  );
}
