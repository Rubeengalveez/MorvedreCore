import { notificationBackTarget } from "@/lib/domain/notifications";
import { notFound, redirect } from "next/navigation";
import type { Route } from "next";
import { requiresGuardianApproval } from "@/lib/domain/family";
import { PageBackLink } from "@/components/ui/page-back-link";
import { PageShell } from "@/components/ui/page-shell";
import { ShopNavigation } from "@/components/shop/shop-navigation";
import { ShopContact } from "@/components/shop/shop-contact";
import { ShopOrderItems } from "@/components/shop/shop-order-items";
import { ShopOrderStatus, shopPublicStatus } from "@/components/shop/shop-order-status";
import { ShopSection } from "@/components/shop/shop-ui";
import { shopMoney } from "@/lib/domain/shop-management";
import { getAdminAccess } from "@/server/actions/admin/_helpers";
import { getActiveProfileContext, getOwnProfilePhone } from "@/server/queries/active-profile";
import { getShopOrder } from "@/server/queries/shop";
import { ParentDecisionForm } from "../../parents/pending/_components/parent-decision-form";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Detalle del pedido — Morvedre Core" };
export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ history?: string; q?: string; from?: string; notificationId?: string }>;
}) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const order = await getShopOrder((await params).id);
  if (!order) notFound();
  const own = order.requested_by === ctx.ownProfile.id,
    family = ctx.linkedProfiles.some((profile) => profile.id === order.requested_by);
  const access = !own && !family ? await getAdminAccess().catch(() => null) : null;
  const manager = Boolean(access?.isAdmin || access?.permissions.has("manage_shop"));
  if (!own && !family && !manager && order.approved_by !== ctx.ownProfile.id) notFound();
  const filters = await searchParams;
  const notification = notificationBackTarget(filters.from, filters.notificationId);
  const backParams = new URLSearchParams();
  if (filters.from === "profile") backParams.set("from", "profile");
  if (filters.from === "family") backParams.set("from", "family");
  if (filters.history === "1") backParams.set("history", "1");
  if (typeof filters.q === "string") backParams.set("q", filters.q.slice(0, 200));
  const canDecide =
      family &&
      order.status === "pending_parent" &&
      !requiresGuardianApproval(ctx.ownProfile.birth_year),
    phone = canDecide ? await getOwnProfilePhone() : null;
  return (
    <PageShell width="md" className="gap-4 pb-8">
      <PageBackLink
        href={
          notification
            ? (notification.href as Route)
            : filters.from === "family" && family
              ? "/shop/parents/pending?from=family"
              : manager
                ? "/admin/shop?view=orders"
                : (`/shop/orders${backParams.size ? `?${backParams}` : ""}` as Route)
        }
      >
        {notification?.label ?? (manager ? "Volver a gestión de pedidos" : "Volver a mis pedidos")}
      </PageBackLink>
      {!manager ? <ShopNavigation profileId={ctx.ownProfile.id} active="orders" /> : null}
      <header className="border-pool-deep/65 text-pool-deep overflow-hidden rounded-2xl border-2 bg-white">
        <div className="bg-pool-deep px-4 py-4 text-white">
          <p className="text-sm font-bold">Pedido</p>
          <h1 className="mt-1 text-2xl font-extrabold">{order.order_reference}</h1>
        </div>
        <div className="space-y-3 p-4">
          <p className="font-extrabold">{order.requested_by_name ?? "Tu pedido"}</p>
          <p className="text-sm font-semibold text-slate-700">
            {new Date(order.requested_at).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <ShopOrderStatus status={order.status} />
          <p className="text-base font-semibold">{shopPublicStatus(order.status).detail}</p>
        </div>
      </header>
      <ShopSection title="Productos del pedido">
        <ShopOrderItems order={order} />
        <div className="border-pool-deep/65 text-pool-deep flex items-center justify-between gap-3 rounded-xl border bg-blue-50 p-3">
          <span className="text-lg font-extrabold">Total</span>
          <strong className="text-2xl tabular-nums">{shopMoney(order.total_cents)}</strong>
        </div>
      </ShopSection>
      {canDecide ? (
        <ShopSection title="Revisa el pedido familiar">
          <ParentDecisionForm
            orderId={order.id}
            initialPhone={phone}
            totalCents={order.total_cents}
          />
        </ShopSection>
      ) : null}
      {[
        { title: "Tus indicaciones", text: order.notes },
        { title: "Nota familiar", text: order.parent_notes },
        { title: "Nota de Sol", text: order.admin_notes },
      ]
        .filter((note) => note.text)
        .map((note) => (
          <ShopSection key={note.title} title={note.title}>
            <p className="text-base [overflow-wrap:anywhere] whitespace-pre-line text-slate-700">
              {note.text}
            </p>
          </ShopSection>
        ))}
      {!manager ? (
        <ShopContact
          message={`Hola Sol, tengo una duda sobre el pedido ${order.order_reference} de la tienda de Morvedre Core.`}
        />
      ) : null}
    </PageShell>
  );
}
