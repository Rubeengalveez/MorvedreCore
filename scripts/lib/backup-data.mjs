import { createHash } from "node:crypto";

export const BACKUP_TABLE_KEYS = {
  access_request_children: ["request_id", "child_profile_id"],
  access_requests: ["id"],
  audit_log: ["id"],
  historical_player_stats: ["profile_id", "season_id"],
  historical_team_matchups: ["id"],
  match_availability: ["player_id", "date"],
  match_callups: ["match_id", "player_id"],
  match_stats: ["match_id", "player_id"],
  live_match_sheets: ["match_id"],
  matches: ["id"],
  news_posts: ["id"],
  news_reactions: ["id"],
  notifications: ["id"],
  opponent_stats: ["season_id", "team_id", "opponent"],
  parent_child_links: ["parent_profile_id", "child_profile_id"],
  profile_notification_prefs: ["profile_id", "notification_type"],
  profile_permissions: ["profile_id", "permission"],
  profiles: ["id"],
  push_subscriptions: ["id"],
  ranking_snapshots: ["season_id", "scope", "scope_key", "player_id"],
  seasons: ["id"],
  shop_order_items: ["id"],
  shop_orders: ["id"],
  shop_product_images: ["id"],
  shop_products: ["id"],
  streaks: ["id"],
  team_rosters: ["team_id", "player_id"],
  team_staff: ["team_id", "profile_id", "role"],
  teams: ["id"],
  training_attendance: ["session_id", "player_id"],
  training_attendance_audit: ["id"],
  training_blocks: ["id"],
  training_sessions: ["id"],
  travel_companions: ["id"],
  travel_offers: ["id"],
  travel_reservations: ["offer_id", "player_id"],
  treasury_concepts: ["id"],
  treasury_lines: ["id"],
  treasury_period_closures: ["id"],
  treasury_profile_concepts: ["id"],
  treasury_profile_settings: ["profile_id"],
  user_roles: ["id"],
};

export function hashTables(tables) {
  return createHash("sha256").update(JSON.stringify(tables)).digest("hex");
}

function assertUniqueRows(table, rows, keys) {
  const seen = new Set();
  for (const row of rows) {
    if (!row || keys.some((key) => row[key] == null))
      throw new Error(`${table}: registro sin clave primaria completa.`);
    const identity = JSON.stringify(keys.map((key) => row[key]));
    if (seen.has(identity)) throw new Error(`${table}: clave primaria duplicada.`);
    seen.add(identity);
  }
}

export async function exportTable(client, table, keys, pageSize = 500) {
  if (!keys.length || !Number.isInteger(pageSize) || pageSize < 1)
    throw new Error("La exportación requiere clave primaria y tamaño de página válido.");
  const rows = [];
  let expectedCount;
  do {
    let query = client.from(table).select("*", { count: "exact" });
    for (const key of keys) query = query.order(key, { ascending: true });
    const { data, error, count } = await query.range(rows.length, rows.length + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!Array.isArray(data) || !Number.isSafeInteger(count) || count < 0)
      throw new Error(`${table}: respuesta sin datos o recuento exacto.`);
    if (expectedCount !== undefined && count !== expectedCount)
      throw new Error(
        `${table}: cambió el número de registros durante la exportación; repite en una ventana sin escrituras.`,
      );
    expectedCount = count;
    if (data.length === 0 && rows.length < expectedCount)
      throw new Error(
        `${table}: respuesta truncada antes de completar ${expectedCount} registros.`,
      );
    rows.push(...data);
  } while (rows.length < expectedCount);
  if (rows.length !== expectedCount) throw new Error(`${table}: recuento inconsistente.`);
  assertUniqueRows(table, rows, keys);
  return rows;
}

export function validateBackup(payload) {
  if (
    payload?.metadata?.version !== "1.2" ||
    !payload.tables ||
    typeof payload.tables !== "object" ||
    Array.isArray(payload.tables)
  )
    throw new Error(
      "Formato no compatible. Genera una exportación v1.2 con el manifiesto completo.",
    );
  const expectedTables = Object.keys(BACKUP_TABLE_KEYS);
  const actualTables = Object.keys(payload.tables);
  if (
    actualTables.length !== expectedTables.length ||
    expectedTables.some((table) => !Array.isArray(payload.tables[table]))
  )
    throw new Error("El manifiesto de tablas está incompleto o contiene tablas desconocidas.");
  let totalRecords = 0;
  for (const [table, keys] of Object.entries(BACKUP_TABLE_KEYS)) {
    const rows = payload.tables[table];
    assertUniqueRows(table, rows, keys);
    if (payload.metadata.rowCounts?.[table] !== rows.length)
      throw new Error(`${table}: el recuento no coincide con los metadatos.`);
    totalRecords += rows.length;
  }
  if (
    payload.metadata.tablesCount !== expectedTables.length ||
    payload.metadata.totalRecords !== totalRecords
  )
    throw new Error("Los totales de la exportación no coinciden.");
  if (
    !/^[a-f0-9]{64}$/.test(payload.metadata.sha256 ?? "") ||
    hashTables(payload.tables) !== payload.metadata.sha256
  )
    throw new Error("Checksum SHA-256 ausente o incorrecto.");
  return { tablesCount: expectedTables.length, totalRecords };
}
