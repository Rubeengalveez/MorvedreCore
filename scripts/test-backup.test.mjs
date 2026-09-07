import test from "node:test";
import assert from "node:assert/strict";
import { BACKUP_TABLE_KEYS, exportTable, hashTables, validateBackup } from "./lib/backup-data.mjs";

function source(rows, options = {}) {
  const calls = [];
  return {
    calls,
    from() {
      const order = [];
      const query = {
        select(_columns, config) {
          assert.equal(config.count, "exact");
          return query;
        },
        order(key) {
          order.push(key);
          return query;
        },
        async range(from, to) {
          calls.push({ from, to, order });
          return (
            options.response?.(calls.length, from, to) ?? {
              data: rows.slice(from, Math.min(to + 1, from + (options.cap ?? Infinity))),
              count: rows.length,
              error: null,
            }
          );
        },
      };
      return query;
    },
  };
}

function payload() {
  const tables = Object.fromEntries(Object.keys(BACKUP_TABLE_KEYS).map((table) => [table, []]));
  tables.profiles = [{ id: "synthetic-profile", display_name: "Prueba" }];
  return {
    metadata: {
      version: "1.2",
      tablesCount: Object.keys(tables).length,
      totalRecords: 1,
      rowCounts: Object.fromEntries(
        Object.entries(tables).map(([table, rows]) => [table, rows.length]),
      ),
      sha256: hashTables(tables),
    },
    tables,
  };
}

test("exports more than 1000 rows even if the server cap is below the requested page size", async () => {
  const rows = Array.from({ length: 1207 }, (_, id) => ({ id }));
  const client = source(rows, { cap: 200 });
  assert.deepEqual(await exportTable(client, "profiles", ["id"]), rows);
  assert.equal(client.calls.length, 7);
  assert.equal(client.calls[1].from, 200);
});

test("orders by every part of a composite key", async () => {
  const rows = [
    { match_id: "a", player_id: "b" },
    { match_id: "a", player_id: "c" },
  ];
  const client = source(rows);
  assert.deepEqual(await exportTable(client, "match_stats", ["match_id", "player_id"], 1), rows);
  assert.deepEqual(client.calls[0].order, ["match_id", "player_id"]);
});

test("accepts an empty table", async () => {
  assert.deepEqual(await exportTable(source([]), "profiles", ["id"]), []);
});

test("rejects changed counts, truncated pages, errors and missing counts", async () => {
  const cases = [
    { data: [{ id: 2 }], count: 3, error: null },
    { data: [], count: 2, error: null },
    { data: null, count: null, error: { message: "unavailable" } },
    { data: [{ id: 2 }], count: null, error: null },
  ];
  for (const response of cases) {
    const client = source([], {
      response: (page) => (page === 1 ? { data: [{ id: 1 }], count: 2, error: null } : response),
    });
    await assert.rejects(exportTable(client, "profiles", ["id"], 1));
  }
});

test("rejects duplicate or incomplete primary keys", async () => {
  await assert.rejects(
    exportTable(source([{ id: 1 }, { id: 1 }]), "profiles", ["id"]),
    /duplicada/,
  );
  await assert.rejects(exportTable(source([{}]), "profiles", ["id"]), /clave primaria/);
});

test("validates a complete serialized synthetic export", () => {
  assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(payload()))), {
    tablesCount: 42,
    totalRecords: 1,
  });
});

test("rejects missing tables, counts, checksum, tampering and legacy partial exports", () => {
  const mutations = [
    (value) => {
      delete value.tables.treasury_profile_settings;
    },
    (value) => {
      value.metadata.rowCounts.profiles = 2;
    },
    (value) => {
      delete value.metadata.sha256;
    },
    (value) => {
      value.tables.profiles[0].display_name = "Alterado";
    },
    (value) => {
      value.metadata.totalRecords = 2;
    },
    (value) => {
      value.metadata.version = "1.1";
    },
  ];
  for (const mutate of mutations) {
    const value = payload();
    mutate(value);
    assert.throws(() => validateBackup(value));
  }
});
