import { AdminPageShell } from "@/components/admin/admin-page";
import { requirePermission } from "@/server/actions/admin/_helpers";
import { getShopManagementOrders } from "@/server/queries/admin-shop";
import { getShopProducts } from "@/server/queries/shop";
import { ShopManagement } from "./_components/shop-management";
import type { ShopListState } from "@/lib/domain/shop-management";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Tienda — Gestión — Morvedre Core" };

export default async function AdminShopPage({
  searchParams,
}: {
  searchParams: Promise<ShopListState>;
}) {
  await requirePermission("manage_shop");
  const state = await searchParams;
  const [orders, products] = await Promise.allSettled([
    getShopManagementOrders(),
    getShopProducts(),
  ]);
  const loadError =
    orders.status === "rejected" || products.status === "rejected"
      ? "No pudimos cargar toda la tienda. Actualiza la página para volver a intentarlo."
      : undefined;
  return (
    <AdminPageShell width="lg">
      <ShopManagement
        orders={orders.status === "fulfilled" ? orders.value : []}
        products={products.status === "fulfilled" ? products.value : []}
        loadError={loadError}
        initialState={state}
      />
    </AdminPageShell>
  );
}
