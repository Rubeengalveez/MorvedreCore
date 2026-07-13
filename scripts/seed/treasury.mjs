import { randomUUID } from "node:crypto";

import { admin, loadBatch, mergeBatch, rand, randPick, resetRng } from "./base.mjs";

const CONCEPTS = [
  {
    code: "CUOTA_MENSUAL",
    label: "Cuota mensual",
    kind: "fee",
    periodicity: "monthly",
    amount: 3500,
    applies: "all_players",
  },
  {
    code: "ESCUELA_TEMPORADA",
    label: "Escuela · temporada completa",
    kind: "fee",
    periodicity: "seasonal",
    amount: 10000,
    applies: "specific_profile",
  },
  {
    code: "MATERIAL_INICIAL",
    label: "Material de inicio",
    kind: "material",
    periodicity: "one_off",
    amount: 4500,
    applies: "specific_profile",
  },
  {
    code: "TORNEO_VERANO",
    label: "Inscripción torneo de verano",
    kind: "tournament",
    periodicity: "one_off",
    amount: 2500,
    applies: "specific_profile",
  },
  {
    code: "DESCUENTO_HERMANOS",
    label: "Descuento por hermanos",
    kind: "discount",
    periodicity: "monthly",
    amount: -500,
    applies: "specific_profile",
  },
];

const PERIODS = [
  {
    label: "Septiembre 2025",
    start: "2025-09-01",
    end: "2025-09-30",
    status: "archived",
    paidRate: 0.96,
  },
  { label: "Abril 2026", start: "2026-04-01", end: "2026-04-30", status: "sent", paidRate: 0.9 },
  { label: "Mayo 2026", start: "2026-05-01", end: "2026-05-31", status: "sent", paidRate: 0.84 },
  { label: "Junio 2026", start: "2026-06-01", end: "2026-06-30", status: "draft", paidRate: 0.62 },
];

async function main() {
  resetRng();
  console.log("[treasury] Generando conceptos, asignaciones y cierres mensuales...\n");

  const batch = loadBatch() ?? {};
  const playerIdsByTeam = batch.playerIdByTeamLabel ?? {};
  const allPlayers = [...new Set(Object.values(playerIdsByTeam).flat())];
  const schoolPlayers = new Set(playerIdsByTeam.Escuela ?? []);
  const generatedBy = batch.dirIds?.[0];
  if (!generatedBy || allPlayers.length === 0) throw new Error("Faltan directiva o jugadores.");

  const { data: season, error: seasonError } = await admin
    .from("seasons")
    .select("id")
    .eq("is_current", true)
    .single();
  if (seasonError) throw seasonError;

  const conceptByCode = new Map();
  for (const concept of CONCEPTS) {
    const id = randomUUID();
    const { error } = await admin.from("treasury_concepts").insert({
      id,
      code: concept.code,
      label: concept.label,
      kind: concept.kind,
      periodicity: concept.periodicity,
      default_amount_cents: concept.amount,
      applies_to: concept.applies,
      active: true,
    });
    if (error) throw error;
    conceptByCode.set(concept.code, id);
  }

  const assignments = [];
  for (const playerId of allPlayers) {
    const school = schoolPlayers.has(playerId);
    assignments.push({
      id: randomUUID(),
      profile_id: playerId,
      concept_id: conceptByCode.get(school ? "ESCUELA_TEMPORADA" : "CUOTA_MENSUAL"),
      amount_cents: school ? 10000 : 3500,
      starts_on: "2025-09-01",
      ends_on: "2026-07-31",
      active: true,
    });
    if (!school && rand() < 0.22) {
      assignments.push({
        id: randomUUID(),
        profile_id: playerId,
        concept_id: conceptByCode.get("DESCUENTO_HERMANOS"),
        amount_cents: -500,
        starts_on: "2025-09-01",
        ends_on: "2026-07-31",
        active: true,
      });
    }
    if (rand() < 0.35) {
      assignments.push({
        id: randomUUID(),
        profile_id: playerId,
        concept_id: conceptByCode.get("MATERIAL_INICIAL"),
        amount_cents: 4500,
        starts_on: "2025-09-01",
        ends_on: null,
        active: true,
      });
    }
  }
  for (let index = 0; index < assignments.length; index += 250) {
    const { error } = await admin
      .from("treasury_profile_concepts")
      .insert(assignments.slice(index, index + 250));
    if (error) throw error;
  }

  const closureIds = [];
  const paymentMethods = ["bank_transfer", "bizum", "cash", "other"];
  for (const period of PERIODS) {
    const closureId = randomUUID();
    const generatedAt = `${period.end}T20:00:00Z`;
    const closureLines = [];
    for (const playerId of allPlayers) {
      const school = schoolPlayers.has(playerId);
      if (school && period.start !== "2025-09-01") continue;
      const paid = rand() < period.paidRate;
      closureLines.push({
        id: randomUUID(),
        closure_id: closureId,
        profile_id: playerId,
        concept_id: conceptByCode.get(school ? "ESCUELA_TEMPORADA" : "CUOTA_MENSUAL"),
        source_type: "concept",
        source_id: null,
        description: school ? "Escuela · temporada 2025/2026" : `Cuota · ${period.label}`,
        amount_cents: school ? 10000 : 3500,
        paid,
        paid_at: paid ? period.end : null,
        payment_method: paid ? randPick(paymentMethods) : null,
      });
    }

    if (period.start === "2025-09-01") {
      for (const playerId of allPlayers.filter(() => rand() < 0.18)) {
        closureLines.push({
          id: randomUUID(),
          closure_id: closureId,
          profile_id: playerId,
          concept_id: conceptByCode.get("MATERIAL_INICIAL"),
          source_type: "concept",
          source_id: null,
          description: "Material de inicio de temporada",
          amount_cents: 4500,
          paid: true,
          paid_at: period.end,
          payment_method: randPick(paymentMethods),
        });
      }
    }

    const total = closureLines.reduce((sum, line) => sum + line.amount_cents, 0);
    const { error: closureError } = await admin.from("treasury_period_closures").insert({
      id: closureId,
      season_id: season.id,
      period_label: period.label,
      period_start: period.start,
      period_end: period.end,
      generated_at: generatedAt,
      generated_by: generatedBy,
      sent_to_email: period.status === "draft" ? null : "tesoreria@morvedre-core.test",
      sent_at: period.status === "draft" ? null : generatedAt,
      status: period.status,
      total_cents: total,
      notes: period.status === "draft" ? "Cierre listo para revisar antes de enviarlo." : null,
    });
    if (closureError) throw closureError;
    for (let index = 0; index < closureLines.length; index += 250) {
      const { error } = await admin
        .from("treasury_lines")
        .insert(closureLines.slice(index, index + 250));
      if (error) throw error;
    }
    closureIds.push(closureId);
  }

  mergeBatch({ treasuryConceptIds: [...conceptByCode.values()], treasuryClosureIds: closureIds });
  console.log(
    `[treasury] OK: ${CONCEPTS.length} conceptos, ${assignments.length} asignaciones y ${closureIds.length} cierres.`,
  );
}

main().catch((error) => {
  console.error("[treasury] FATAL:", error);
  process.exit(1);
});
