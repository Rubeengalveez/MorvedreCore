import { describe, expect, it } from "vitest";

import {
  buildPeriodClosure,
  eurosToCents,
  formatTreasuryCents,
  monthLabel,
} from "@/lib/domain/treasury";

const profiles = [
  { id: "p1", full_name: "Jugador Uno", is_player: true },
  { id: "p2", full_name: "Jugador Dos", is_player: true },
  { id: "d1", full_name: "Directiva", is_player: false },
];

describe("treasury domain", () => {
  it("convierte euros a centimos", () => {
    expect(eurosToCents(60)).toBe(6000);
    expect(eurosToCents(12.35)).toBe(1235);
  });

  it("formatea importes positivos y negativos", () => {
    expect(formatTreasuryCents(6000)).toContain("60,00");
    expect(formatTreasuryCents(6000)).toContain("€");
    expect(formatTreasuryCents(-500)).toContain("5,00");
    expect(formatTreasuryCents(-500)).toContain("-");
  });

  it("calcula etiqueta mensual", () => {
    expect(monthLabel("2026-07-01")).toContain("2026");
  });

  it("genera cierre con concepto global, descuento y tienda", () => {
    const draft = buildPeriodClosure({
      periodStart: "2026-07-01",
      periodEnd: "2026-07-31",
      profiles,
      concepts: [
        {
          id: "c1",
          code: "CUOTA",
          label: "Cuota mensual",
          kind: "fee",
          periodicity: "monthly",
          default_amount_cents: 6000,
          applies_to: "all_players",
          active: true,
        },
        {
          id: "c2",
          code: "HERMANO",
          label: "Descuento hermano",
          kind: "discount",
          periodicity: "monthly",
          default_amount_cents: 500,
          applies_to: "specific_profile",
          active: true,
        },
      ],
      assignments: [
        {
          id: "a1",
          profile_id: "p2",
          concept_id: "c2",
          amount_cents: null,
          starts_on: "2026-07-01",
          ends_on: null,
          active: true,
        },
      ],
      shopOrders: [
        {
          id: "o1",
          requested_by: "p1",
          total_cents: 2500,
          requested_at: "2026-07-10T10:00:00.000Z",
          status: "pending_admin",
        },
      ],
    });

    expect(draft.lines).toHaveLength(4);
    expect(draft.total_cents).toBe(14000);
  });

  it("ignora asignaciones fuera de periodo e inactivas", () => {
    const draft = buildPeriodClosure({
      periodStart: "2026-07-01",
      periodEnd: "2026-07-31",
      profiles,
      concepts: [
        {
          id: "c1",
          code: "AJUSTE",
          label: "Ajuste",
          kind: "adjustment",
          periodicity: "one_off",
          default_amount_cents: 1000,
          applies_to: "specific_profile",
          active: true,
        },
      ],
      assignments: [
        {
          id: "a1",
          profile_id: "p1",
          concept_id: "c1",
          amount_cents: null,
          starts_on: "2026-08-01",
          ends_on: null,
          active: true,
        },
        {
          id: "a2",
          profile_id: "p1",
          concept_id: "c1",
          amount_cents: null,
          starts_on: "2026-07-10",
          ends_on: null,
          active: false,
        },
      ],
      shopOrders: [],
    });

    expect(draft.lines).toHaveLength(0);
    expect(draft.total_cents).toBe(0);
  });
});
