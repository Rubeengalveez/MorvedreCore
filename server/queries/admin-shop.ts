import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/server/actions/admin/_helpers";
import { hydrateShopOrders } from "./shop";
import {
  ACTIVE_SHOP_STATUSES,
  shopAgeCategory,
  type ManagedShopOrder,
} from "@/lib/domain/shop-management";
import type { ShopOrderStatus } from "@/lib/domain/shop";
import { shopFamilyIds } from "@/lib/domain/shop-catalog";
import { z } from "zod";
import { calendarSeasonStartYear } from "@/lib/domain/categories";

export async function loadShopManagementOrders(
  statuses: ShopOrderStatus[],
  orderId?: string,
  profileIds?: string[],
): Promise<ManagedShopOrder[]> {
  const admin = createAdminClient();
  const orders: ManagedShopOrder[] = [];
  const { data: season, error: seasonError } = await admin
    .from("seasons")
    .select("start_date")
    .eq("is_current", true)
    .maybeSingle();
  if (seasonError) throw new Error("No pudimos comprobar la temporada para las categorías.");
  const seasonYear = season ? Number(season.start_date.slice(0, 4)) : calendarSeasonStartYear();
  for (let offset = 0; ; offset += 100) {
    let query = admin
      .from("shop_orders")
      .select("*")
      .in("status", statuses)
      .order("requested_at", { ascending: false })
      .order("id")
      .range(offset, offset + 99);
    if (orderId) query = query.eq("id", orderId);
    if (profileIds) query = query.in("requested_by", profileIds);
    const { data, error } = await query;
    if (error) throw new Error("No pudimos cargar los pedidos. Inténtalo de nuevo.");
    if (!data?.length) break;
    const [hydrated, profilesResult, playerRoles] = await Promise.all([
      hydrateShopOrders(data, admin),
      admin
        .from("profiles")
        .select("id, birth_year, email_contact, phone_e164")
        .in("id", [
          ...new Set(
            data.flatMap((order) =>
              [order.requested_by, order.approved_by].filter((id): id is string => Boolean(id)),
            ),
          ),
        ]),
      admin
        .from("user_roles")
        .select("profile_id")
        .eq("role", "player")
        .in("profile_id", [...new Set(data.map((order) => order.requested_by))]),
    ]);
    if (profilesResult.error || playerRoles.error)
      throw new Error("No pudimos cargar los datos de contacto de los pedidos.");
    const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
    const players = new Set((playerRoles.data ?? []).map((role) => role.profile_id));
    orders.push(
      ...hydrated.map((order) => {
        const requester = profiles.get(order.requested_by);
        const guardian = order.approved_by ? profiles.get(order.approved_by) : null;
        return {
          ...order,
          category_label: players.has(order.requested_by)
            ? shopAgeCategory(requester?.birth_year ?? null, seasonYear)
            : null,
          requester_email: requester?.email_contact ?? null,
          guardian_phone: guardian?.phone_e164 ?? null,
          guardian_email: guardian?.email_contact ?? null,
        };
      }),
    );
    if (data.length < 100) break;
  }
  return orders;
}

export async function getShopManagementOrders(): Promise<ManagedShopOrder[]> {
  await requirePermission("manage_shop");
  return loadShopManagementOrders([...ACTIVE_SHOP_STATUSES, "delivered"]);
}

export async function getShopFamilyHistory(profileId: string) {
  await requirePermission("manage_shop");
  z.uuid().parse(profileId);
  const admin = createAdminClient();
  const links: Array<{ parent_profile_id: string; child_profile_id: string }> = [];
  for (let offset = 0; ; offset += 500) {
    const result = await admin
      .from("parent_child_links")
      .select("parent_profile_id,child_profile_id")
      .order("parent_profile_id")
      .order("child_profile_id")
      .range(offset, offset + 499);
    if (result.error) throw new Error("No pudimos cargar los vínculos de esta familia.");
    links.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 500) break;
  }
  const ids = shopFamilyIds(profileId, links);
  const [profiles, orders] = await Promise.all([
    admin.from("profiles").select("id,full_name").in("id", ids).order("full_name"),
    loadShopManagementOrders(
      ["pending_parent", ...ACTIVE_SHOP_STATUSES, "delivered", "rejected", "cancelled"],
      undefined,
      ids,
    ),
  ]);
  if (profiles.error) throw new Error("No pudimos cargar los nombres de esta familia.");
  const parents = new Set(
    links
      .filter((link) => ids.includes(link.parent_profile_id))
      .map((link) => link.parent_profile_id),
  );
  return {
    members: (profiles.data ?? []).map((profile) => ({
      ...profile,
      relationship: parents.has(profile.id)
        ? "Madre / padre"
        : ids.length > 1
          ? "Hijo / hija"
          : "Socio",
    })),
    orders,
  };
}
