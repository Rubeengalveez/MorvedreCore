import { randomUUID } from "node:crypto";

import { admin, mergeBatch } from "./base.mjs";

const PASSWORD = process.env.FAMILY_DEMO_PASSWORD ?? process.env.SEED_PASSWORD;
const ACCOUNTS = {
  parent: { email: "familia.demo@morvedre-core.test", name: "Carmen Torres Demo", birthYear: 1982 },
  firstChild: { email: "lucia.demo@morvedre-core.test", name: "Lucía Torres Demo" },
  secondChild: { email: "mateo.demo@morvedre-core.test", name: "Mateo Torres Demo" },
};

async function findAuthUser(email) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 100) return null;
  }
  return null;
}

async function attachDemoAccount(profile, account, birthYear = profile.birth_year) {
  const existingDemo = await findAuthUser(account.email);
  let authUserId = existingDemo?.id ?? profile.auth_user_id;
  if (!authUserId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: account.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: account.name },
    });
    if (error) throw error;
    authUserId = data.user.id;
  } else {
    const { error } = await admin.auth.admin.updateUserById(authUserId, {
      email: account.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: account.name },
    });
    if (error) throw error;
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      auth_user_id: authUserId,
      full_name: account.name,
      email_contact: account.email,
      birth_year: birthYear,
      must_change_password: false,
      is_active: true,
    })
    .eq("id", profile.id);
  if (profileError) throw profileError;
  return { ...profile, auth_user_id: authUserId, full_name: account.name, birth_year: birthYear };
}

async function pickPlayerForCategory(seasonId, categoryCode) {
  const { data: teams, error: teamError } = await admin
    .from("teams")
    .select("id, label, color")
    .eq("season_id", seasonId)
    .eq("category_code", categoryCode)
    .order("label")
    .limit(1);
  if (teamError || !teams?.[0]) throw teamError ?? new Error(`No hay equipo ${categoryCode}.`);
  const team = teams[0];
  const { data: roster, error: rosterError } = await admin
    .from("team_rosters")
    .select(
      "player_id, profiles!team_rosters_player_id_fkey(id, auth_user_id, full_name, birth_year)",
    )
    .eq("team_id", team.id)
    .is("left_at", null)
    .order("joined_at")
    .limit(1);
  if (rosterError || !roster?.[0])
    throw rosterError ?? new Error(`No hay plantilla ${categoryCode}.`);
  const joined = roster[0].profiles;
  const profile = Array.isArray(joined) ? joined[0] : joined;
  if (!profile) throw new Error(`No hay perfil en ${categoryCode}.`);
  return { profile, team };
}

async function ensureUpcomingCallup(seasonId, team, playerId, daysAhead) {
  const { data: existingMatches, error: existingMatchError } = await admin
    .from("matches")
    .select("id")
    .eq("team_id", team.id)
    .in("status", ["scheduled", "in_progress"])
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at")
    .limit(1);
  if (existingMatchError) throw existingMatchError;

  let matchId = existingMatches?.[0]?.id;
  if (!matchId) {
    const scheduledAt = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
    scheduledAt.setHours(11, 0, 0, 0);
    const { data: createdMatch, error: matchError } = await admin
      .from("matches")
      .insert({
        season_id: seasonId,
        team_id: team.id,
        opponent: "CN Demo Familiar",
        competition_type: "friendly",
        is_home: true,
        pool_name: "Piscina Municipal Puerto de Sagunto",
        scheduled_at: scheduledAt.toISOString(),
        status: "scheduled",
        logistics_enabled: false,
        notes: "Partido demo para probar la gestión de convocatorias familiares.",
      })
      .select("id")
      .single();
    if (matchError) throw matchError;
    matchId = createdMatch.id;
  }

  const { data: existingCallup, error: existingCallupError } = await admin
    .from("match_callups")
    .select("match_id")
    .eq("match_id", matchId)
    .eq("player_id", playerId)
    .maybeSingle();
  if (existingCallupError) throw existingCallupError;
  const { error: callupError } = existingCallup
    ? await admin
        .from("match_callups")
        .update({ status: "called", confirmed_at: null })
        .eq("match_id", matchId)
        .eq("player_id", playerId)
    : await admin.from("match_callups").insert({
        match_id: matchId,
        player_id: playerId,
        status: "called",
        source_team_id: team.id,
      });
  if (callupError) throw callupError;
  return matchId;
}

async function main() {
  if (!PASSWORD || PASSWORD.length < 12) {
    console.log(
      "[family-demo] Omitido: define FAMILY_DEMO_PASSWORD o SEED_PASSWORD con 12 caracteres.",
    );
    return;
  }

  console.log("[family-demo] Preparando una familia completa para pruebas...");
  const { data: season, error: seasonError } = await admin
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();
  if (seasonError) throw seasonError;

  const { data: parentRoles, error: parentRoleError } = await admin
    .from("user_roles")
    .select("profile_id")
    .eq("role", "parent")
    .is("scope_team_id", null)
    .limit(1);
  if (parentRoleError || !parentRoles?.[0]) {
    throw parentRoleError ?? new Error("No hay perfiles familiares para preparar la demo.");
  }
  const { data: parentProfile, error: parentError } = await admin
    .from("profiles")
    .select("id, auth_user_id, full_name, birth_year")
    .eq("id", parentRoles[0].profile_id)
    .single();
  if (parentError) throw parentError;

  const [firstPick, secondPick] = await Promise.all([
    pickPlayerForCategory(season.id, "benjamin"),
    pickPlayerForCategory(season.id, "infantil"),
  ]);
  const [parent, firstChild, secondChild] = await Promise.all([
    attachDemoAccount(parentProfile, ACCOUNTS.parent, ACCOUNTS.parent.birthYear),
    attachDemoAccount(firstPick.profile, ACCOUNTS.firstChild, 2016),
    attachDemoAccount(secondPick.profile, ACCOUNTS.secondChild, 2012),
  ]);

  await admin.from("parent_child_links").delete().eq("parent_profile_id", parent.id);
  const { error: linkError } = await admin.from("parent_child_links").upsert(
    [
      { parent_profile_id: parent.id, child_profile_id: firstChild.id, relation: "mother" },
      { parent_profile_id: parent.id, child_profile_id: secondChild.id, relation: "mother" },
    ],
    { onConflict: "parent_profile_id,child_profile_id" },
  );
  if (linkError) throw linkError;

  const matchIds = await Promise.all([
    ensureUpcomingCallup(season.id, firstPick.team, firstChild.id, 8),
    ensureUpcomingCallup(season.id, secondPick.team, secondChild.id, 10),
  ]);

  const { error: billingError } = await admin.from("treasury_profile_settings").upsert(
    [firstChild.id, secondChild.id].map((profileId) => ({
      profile_id: profileId,
      billing_profile_id: parent.id,
      fee_exempt: false,
      updated_by: parent.id,
    })),
    { onConflict: "profile_id" },
  );
  if (billingError) throw billingError;

  await admin
    .from("shop_orders")
    .delete()
    .eq("requested_by", firstChild.id)
    .eq("status", "pending_parent");
  const { data: product, error: productError } = await admin
    .from("shop_products")
    .select("id, title, price_cents, sizes")
    .eq("available", true)
    .order("title")
    .limit(1)
    .single();
  if (productError) throw productError;
  const orderId = randomUUID();
  const { error: orderError } = await admin.from("shop_orders").insert({
    id: orderId,
    requested_by: firstChild.id,
    status: "pending_parent",
    total_cents: product.price_cents,
    currency: "EUR",
    notes: "Pedido de prueba para comprobar la aprobación familiar.",
    contact_phone_e164: "+34600111222",
    guardian_approval_required: true,
  });
  if (orderError) throw orderError;
  const size = Array.isArray(product.sizes) ? (product.sizes[0] ?? null) : null;
  const { error: itemError } = await admin.from("shop_order_items").insert({
    id: randomUUID(),
    order_id: orderId,
    product_id: product.id,
    size,
    personalization: "LUCÍA",
    quantity: 1,
    unit_price_cents: product.price_cents,
    subtotal_cents: product.price_cents,
  });
  if (itemError) throw itemError;

  const { error: notificationError } = await admin.from("notifications").insert({
    recipient_id: parent.id,
    kind: "news_pinned",
    title: "Compra de Lucía por revisar",
    body: `${product.title}${size ? ` · Talla ${size}` : ""}`,
    href: `/shop/orders/${orderId}`,
    related_match_id: null,
  });
  if (notificationError) throw notificationError;

  mergeBatch({
    familyDemo: {
      parentProfileId: parent.id,
      childProfileIds: [firstChild.id, secondChild.id],
      emails: [ACCOUNTS.parent.email, ACCOUNTS.firstChild.email, ACCOUNTS.secondChild.email],
      orderId,
      matchIds,
    },
  });
  console.log(
    `[family-demo] OK: ${parent.full_name} con ${firstChild.full_name} y ${secondChild.full_name}.`,
  );
}

main().catch((error) => {
  console.error("[family-demo] FATAL:", error);
  process.exit(1);
});
