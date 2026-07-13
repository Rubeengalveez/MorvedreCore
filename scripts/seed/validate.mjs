import { admin, fetchAll, resetRng } from "./base.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function countRows(table, configure = (query) => query) {
  const { count, error } = await configure(
    admin.from(table).select("*", { count: "exact", head: true }),
  );
  if (error) throw error;
  return count ?? 0;
}

async function main() {
  resetRng();
  console.log("[validate] Verificando cobertura y coherencia del conjunto demo...\n");

  const { data: seasons, error: seasonError } = await admin
    .from("seasons")
    .select("id, is_current, archived_at");
  if (seasonError) throw seasonError;
  const currentSeasons = (seasons ?? []).filter((season) => season.is_current);
  assert(currentSeasons.length === 1, "Debe existir exactamente una temporada actual.");
  assert(currentSeasons[0].archived_at == null, "La temporada actual no puede estar archivada.");
  const currentSeasonId = currentSeasons[0].id;

  const { data: teams, error: teamError } = await admin
    .from("teams")
    .select("id, label, team_type")
    .eq("season_id", currentSeasonId);
  if (teamError) throw teamError;
  assert(teams?.length === 8, `Se esperaban 8 equipos actuales y hay ${teams?.length ?? 0}.`);
  const { data: rosters, error: rosterError } = await admin
    .from("team_rosters")
    .select("team_id, player_id");
  if (rosterError) throw rosterError;
  for (const team of teams ?? []) {
    const size = (rosters ?? []).filter((roster) => roster.team_id === team.id).length;
    const minimum = team.team_type === "school" ? 3 : 13;
    assert(size >= minimum, `${team.label} tiene ${size} jugadores; necesita al menos ${minimum}.`);
  }

  const nowIso = new Date().toISOString();
  const playedMatches = await countRows("matches", (query) => query.eq("status", "played"));
  const upcomingMatches = await countRows("matches", (query) =>
    query.gte("scheduled_at", nowIso).in("status", ["scheduled", "postponed"]),
  );
  assert(playedMatches >= 70, `Solo hay ${playedMatches} partidos jugados.`);
  assert(upcomingMatches >= 14, `Solo hay ${upcomingMatches} partidos futuros.`);

  const pastSessions = await countRows("training_sessions", (query) =>
    query.lt("scheduled_at", nowIso),
  );
  const futureSessions = await countRows("training_sessions", (query) =>
    query.gte("scheduled_at", nowIso),
  );
  const cancelledSessions = await countRows("training_sessions", (query) =>
    query.eq("cancelled", true),
  );
  assert(pastSessions >= 500, `Solo hay ${pastSessions} entrenamientos pasados.`);
  assert(futureSessions >= 20, `Solo hay ${futureSessions} entrenamientos futuros.`);
  assert(cancelledSessions > 0, "No hay entrenamientos cancelados para probar ese estado.");

  const minimums = {
    ranking_snapshots: 300,
    streaks: 450,
    shop_products: 12,
    shop_product_images: 4,
    shop_orders: 18,
    treasury_concepts: 5,
    treasury_period_closures: 4,
    treasury_lines: 250,
    travel_offers: 14,
    travel_reservations: 14,
    historical_player_stats: 120,
    historical_team_matchups: 50,
    news_posts: 12,
    access_requests: 4,
    parent_child_links: 90,
  };
  for (const [table, minimum] of Object.entries(minimums)) {
    const actual = await countRows(table);
    assert(actual >= minimum, `${table} tiene ${actual} filas; se esperaban al menos ${minimum}.`);
  }

  const offers = await fetchAll(() => admin.from("travel_offers").select("id, seats_taken"));
  const reservations = await fetchAll(() =>
    admin.from("travel_reservations").select("offer_id, cancelled_at"),
  );
  for (const offer of offers) {
    const active = reservations.filter(
      (reservation) => reservation.offer_id === offer.id && reservation.cancelled_at == null,
    ).length;
    assert(
      offer.seats_taken === active,
      `El coche ${offer.id} indica ${offer.seats_taken} plazas ocupadas y tiene ${active}.`,
    );
  }

  const played = await fetchAll(() =>
    admin.from("matches").select("id, final_score_us").eq("status", "played"),
  );
  const stats = await fetchAll(() => admin.from("match_stats").select("match_id, goals"));
  for (const match of played) {
    const goals = stats
      .filter((stat) => stat.match_id === match.id)
      .reduce((sum, stat) => sum + stat.goals, 0);
    assert(
      goals === match.final_score_us,
      `El acta ${match.id} suma ${goals} goles y el marcador indica ${match.final_score_us}.`,
    );
  }

  let adminUser;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    adminUser = data.users.find((user) => user.email?.toLowerCase() === "galvillo9@gmail.com");
    if (adminUser || data.users.length < 100) break;
  }
  assert(adminUser, "No se ha conservado el usuario administrador.");
  const { data: adminProfile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("auth_user_id", adminUser.id)
    .single();
  if (profileError) throw profileError;
  const { data: adminRoles, error: rolesError } = await admin
    .from("user_roles")
    .select("role")
    .eq("profile_id", adminProfile.id);
  if (rolesError) throw rolesError;
  assert(
    adminRoles.some((role) => role.role === "admin"),
    "El perfil administrador no tiene rol admin.",
  );

  console.log(
    `[validate] OK: ${teams.length} equipos, ${playedMatches} partidos jugados, ${upcomingMatches} futuros y ${pastSessions + futureSessions} entrenamientos.`,
  );
}

main().catch((error) => {
  console.error("[validate] FATAL:", error);
  process.exit(1);
});
