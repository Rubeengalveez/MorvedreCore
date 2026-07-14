export type TreasuryConceptKind = "fee" | "material" | "tournament" | "adjustment" | "discount";
export type TreasuryPeriodicity = "monthly" | "seasonal" | "one_off";
export type TreasuryAppliesTo =
  "all_players" | "all_members" | "specific_role" | "specific_profile";
export type TreasuryClosureStatus = "draft" | "sent" | "archived";
export type TreasuryPaymentMethod = "bank_transfer" | "bizum" | "cash" | "other";

export interface TreasuryConceptInput {
  id: string;
  code: string;
  label: string;
  kind: TreasuryConceptKind;
  periodicity: TreasuryPeriodicity;
  default_amount_cents: number | null;
  applies_to: TreasuryAppliesTo;
  active: boolean;
}

export interface TreasuryAssignmentInput {
  id: string;
  profile_id: string;
  concept_id: string;
  amount_cents: number | null;
  starts_on: string | null;
  ends_on: string | null;
  active: boolean;
}

export interface TreasuryProfileInput {
  id: string;
  full_name: string;
  is_player: boolean;
}

export interface TreasuryShopOrderInput {
  id: string;
  requested_by: string;
  total_cents: number;
  requested_at: string;
  status: string;
}

export interface TreasuryDraftLine {
  profile_id: string;
  concept_id: string | null;
  source_type: "concept" | "shop_order" | "monthly_fee";
  source_id: string | null;
  description: string;
  amount_cents: number;
}

export interface TreasuryClosureDraft {
  lines: TreasuryDraftLine[];
  total_cents: number;
}

export const TREASURY_KIND_LABELS: Record<TreasuryConceptKind, string> = {
  fee: "Cuota",
  material: "Material",
  tournament: "Torneo",
  adjustment: "Ajuste",
  discount: "Descuento",
};

export const TREASURY_PERIODICITY_LABELS: Record<TreasuryPeriodicity, string> = {
  monthly: "Mensual",
  seasonal: "Temporada",
  one_off: "Puntual",
};

export const TREASURY_STATUS_LABELS: Record<TreasuryClosureStatus, string> = {
  draft: "Borrador",
  sent: "Enviado",
  archived: "Archivado",
};

export function eurosToCents(value: number): number {
  return Math.round(value * 100);
}

export function centsToEuros(value: number): number {
  return value / 100;
}

export function formatTreasuryCents(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return `${sign}${(abs / 100).toFixed(2)} EUR`;
}

export function monthLabel(periodStart: string): string {
  const date = new Date(`${periodStart}T12:00:00`);
  const label = date.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function buildPeriodClosure(input: {
  periodStart: string;
  periodEnd: string;
  concepts: TreasuryConceptInput[];
  assignments: TreasuryAssignmentInput[];
  profiles: TreasuryProfileInput[];
  shopOrders: TreasuryShopOrderInput[];
}): TreasuryClosureDraft {
  const conceptById = new Map(input.concepts.map((concept) => [concept.id, concept]));
  const lines: TreasuryDraftLine[] = [];

  for (const assignment of input.assignments) {
    if (!assignment.active) continue;
    if (assignment.starts_on && assignment.starts_on > input.periodEnd) continue;
    if (assignment.ends_on && assignment.ends_on < input.periodStart) continue;
    const concept = conceptById.get(assignment.concept_id);
    if (!concept?.active) continue;
    if (concept.periodicity === "one_off" && assignment.starts_on) {
      if (assignment.starts_on < input.periodStart || assignment.starts_on > input.periodEnd)
        continue;
    }
    const amount = assignment.amount_cents ?? concept.default_amount_cents ?? 0;
    if (amount === 0) continue;
    lines.push({
      profile_id: assignment.profile_id,
      concept_id: concept.id,
      source_type: "concept",
      source_id: assignment.id,
      description: concept.label,
      amount_cents: concept.kind === "discount" && amount > 0 ? -amount : amount,
    });
  }

  for (const concept of input.concepts) {
    if (!concept.active) continue;
    if (concept.applies_to !== "all_players" && concept.applies_to !== "all_members") continue;
    if (concept.default_amount_cents == null || concept.default_amount_cents === 0) continue;
    const targets = input.profiles.filter((profile) =>
      concept.applies_to === "all_players" ? profile.is_player : true,
    );
    for (const profile of targets) {
      lines.push({
        profile_id: profile.id,
        concept_id: concept.id,
        source_type: "concept",
        source_id: null,
        description: concept.label,
        amount_cents:
          concept.kind === "discount" && concept.default_amount_cents > 0
            ? -concept.default_amount_cents
            : concept.default_amount_cents,
      });
    }
  }

  for (const order of input.shopOrders) {
    if (!["pending_admin", "ordered", "received", "delivered"].includes(order.status)) continue;
    const date = order.requested_at.slice(0, 10);
    if (date < input.periodStart || date > input.periodEnd) continue;
    lines.push({
      profile_id: order.requested_by,
      concept_id: null,
      source_type: "shop_order",
      source_id: order.id,
      description: "Pedido de tienda",
      amount_cents: order.total_cents,
    });
  }

  lines.sort((a, b) => {
    const profileCompare = a.profile_id.localeCompare(b.profile_id);
    if (profileCompare !== 0) return profileCompare;
    return a.description.localeCompare(b.description, "es");
  });

  return {
    lines,
    total_cents: lines.reduce((acc, line) => acc + line.amount_cents, 0),
  };
}
