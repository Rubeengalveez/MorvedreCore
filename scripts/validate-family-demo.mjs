import { createClient } from "@supabase/supabase-js";

import { admin, url } from "./seed/base.mjs";

const password = process.env.FAMILY_DEMO_PASSWORD ?? process.env.SEED_PASSWORD;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!password || !anonKey || !url) {
  throw new Error(
    "Faltan FAMILY_DEMO_PASSWORD/SEED_PASSWORD o las variables públicas de Supabase.",
  );
}

function authenticatedClient() {
  return createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function signIn(email) {
  const client = authenticatedClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw error ?? new Error(`No se pudo iniciar sesión con ${email}.`);
  return client;
}

async function ownProfile(client) {
  const {
    data: { user },
  } = await client.auth.getUser();
  const { data, error } = await client
    .from("profiles")
    .select("id, full_name, birth_year")
    .eq("auth_user_id", user.id)
    .single();
  if (error) throw error;
  return data;
}

async function main() {
  const parentClient = await signIn("familia.demo@morvedre-core.test");
  const parent = await ownProfile(parentClient);
  const { data: links, error: linksError } = await parentClient
    .from("parent_child_links")
    .select("child_profile_id")
    .eq("parent_profile_id", parent.id);
  if (linksError) throw linksError;
  if (links.length !== 2) throw new Error(`La cuenta familiar tiene ${links.length} hijos, no 2.`);

  const childIds = links.map((link) => link.child_profile_id);
  const { data: childCallups, error: childCallupsError } = await parentClient
    .from("match_callups")
    .select("match_id, player_id, status")
    .in("player_id", childIds)
    .limit(1);
  if (childCallupsError) throw childCallupsError;
  const managedCallup = childCallups?.[0];
  if (!managedCallup) throw new Error("La familia no tiene una convocatoria demo gestionable.");
  const { error: unsafeCallupError } = await parentClient
    .from("match_callups")
    .update({ status: "no_show" })
    .eq("match_id", managedCallup.match_id)
    .eq("player_id", managedCallup.player_id);
  if (!unsafeCallupError) {
    throw new Error("La Data API permite que un tutor marque una ausencia administrativa.");
  }
  const { data: updatedCallup, error: guardianCallupError } = await parentClient
    .from("match_callups")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("match_id", managedCallup.match_id)
    .eq("player_id", managedCallup.player_id)
    .select("status")
    .single();
  if (guardianCallupError || updatedCallup.status !== "confirmed") {
    throw guardianCallupError ?? new Error("El tutor no puede responder por su hijo vinculado.");
  }
  const { error: callupResetError } = await admin
    .from("match_callups")
    .update({ status: managedCallup.status, confirmed_at: null })
    .eq("match_id", managedCallup.match_id)
    .eq("player_id", managedCallup.player_id);
  if (callupResetError) throw callupResetError;

  const { data: parentTreasury, error: parentTreasuryError } = await parentClient
    .from("treasury_lines")
    .select("id, profile_id, amount_cents")
    .in("profile_id", childIds);
  if (parentTreasuryError) throw parentTreasuryError;
  if (parentTreasury.length === 0)
    throw new Error("La familia no tiene movimientos de tesorería demo.");

  const { data: familyOrders, error: familyOrdersError } = await parentClient
    .from("shop_orders")
    .select("id, requested_by, status, guardian_approval_required")
    .in("requested_by", childIds)
    .eq("status", "pending_parent");
  if (familyOrdersError) throw familyOrdersError;
  if (!familyOrders.some((order) => order.guardian_approval_required)) {
    throw new Error("No hay una compra de menor pendiente de aprobación.");
  }
  const pendingFamilyOrder = familyOrders.find((order) => order.guardian_approval_required);
  const { error: directApprovalError } = await parentClient
    .from("shop_orders")
    .update({ status: "pending_admin" })
    .eq("id", pendingFamilyOrder.id);
  if (!directApprovalError) {
    throw new Error(
      "Un tutor puede saltarse la Server Action y aprobar directamente por Data API.",
    );
  }

  const childClient = await signIn("lucia.demo@morvedre-core.test");
  const child = await ownProfile(childClient);
  const secondChildClient = await signIn("mateo.demo@morvedre-core.test");
  const secondChild = await ownProfile(secondChildClient);
  if (!childIds.includes(child.id) || !childIds.includes(secondChild.id)) {
    throw new Error("Las cuentas demo de los dos hijos no pertenecen a la familia tutora.");
  }
  const { data: childTreasury, error: childTreasuryError } = await childClient
    .from("treasury_lines")
    .select("id")
    .eq("profile_id", child.id);
  if (childTreasuryError) throw childTreasuryError;
  if (childTreasury.length !== 0) throw new Error("RLS expone importes de tesorería a un menor.");

  const { data: childOrders, error: childOrdersError } = await childClient
    .from("shop_orders")
    .select("id, status")
    .eq("requested_by", child.id)
    .eq("status", "pending_parent");
  if (childOrdersError) throw childOrdersError;
  if (childOrders.length === 0) throw new Error("El menor no puede consultar su propio pedido.");

  const { data: adultPending, error: adultInsertError } = await admin
    .from("shop_orders")
    .insert({
      requested_by: parent.id,
      status: "pending_parent",
      total_cents: 100,
      currency: "EUR",
      contact_phone_e164: "+34600111222",
    })
    .select("id, status, guardian_approval_required")
    .single();
  if (adultInsertError) throw adultInsertError;
  await admin.from("shop_orders").delete().eq("id", adultPending.id);
  if (adultPending.status !== "pending_admin" || adultPending.guardian_approval_required) {
    throw new Error("Un adulto ha quedado bloqueado por el flujo de aprobación familiar.");
  }

  const { data: anotherAdult } = await admin
    .from("profiles")
    .select("id")
    .lte("birth_year", new Date().getFullYear() - 18)
    .neq("id", parent.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (!anotherAdult) throw new Error("No hay otro adulto para validar vínculos familiares.");
  const { error: adultChildLinkError } = await admin.from("parent_child_links").insert({
    parent_profile_id: anotherAdult.id,
    child_profile_id: parent.id,
    relation: "other",
  });
  if (!adultChildLinkError) {
    await admin
      .from("parent_child_links")
      .delete()
      .eq("parent_profile_id", anotherAdult.id)
      .eq("child_profile_id", parent.id);
    throw new Error("La base ha permitido vincular a una persona adulta como menor gestionado.");
  }
  const { error: minorGuardianLinkError } = await admin.from("parent_child_links").insert({
    parent_profile_id: childIds[0],
    child_profile_id: childIds[1],
    relation: "other",
  });
  if (!minorGuardianLinkError) {
    await admin
      .from("parent_child_links")
      .delete()
      .eq("parent_profile_id", childIds[0])
      .eq("child_profile_id", childIds[1]);
    throw new Error("La base ha permitido usar a un menor como tutor.");
  }

  console.log("[family-demo] Validación completa:");
  console.log(`  - Tutor autenticado con ${links.length} hijos simultáneos.`);
  console.log("  - Las cuentas independientes de Lucía y Mateo están autenticadas y vinculadas.");
  console.log(`  - ${parentTreasury.length} movimientos familiares visibles para el tutor.`);
  console.log("  - Compra de menor pendiente y visible para tutor e hija.");
  console.log("  - El tutor puede responder convocatorias por un hijo vinculado.");
  console.log("  - La Data API bloquea estados de convocatoria reservados al entrenador.");
  console.log("  - Tesorería del menor protegida por RLS.");
  console.log("  - Pedido de adulto enviado directamente a tienda.");
  console.log("  - Aprobación directa por Data API bloqueada.");
  console.log("  - Vínculos adulto-como-hijo y menor-como-tutor bloqueados por trigger.");
}

main().catch((error) => {
  console.error("[family-demo] VALIDATION FAILED:", error);
  process.exit(1);
});
