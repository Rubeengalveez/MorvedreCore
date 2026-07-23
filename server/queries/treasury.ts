import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { canViewPersonalFinances } from "@/lib/domain/family";
import {
  formatTreasuryCents,
  type TreasuryAppliesTo,
  type TreasuryClosureStatus,
  type TreasuryConceptKind,
  type TreasuryPaymentMethod,
  type TreasuryPeriodicity,
} from "@/lib/domain/treasury";

export interface TreasuryConcept {
  id: string;
  code: string;
  label: string;
  kind: TreasuryConceptKind;
  periodicity: TreasuryPeriodicity;
  default_amount_cents: number | null;
  applies_to: TreasuryAppliesTo;
  active: boolean;
}

export interface TreasuryAssignment {
  id: string;
  profile_id: string;
  profile_name: string;
  concept_id: string;
  concept_label: string;
  amount_cents: number | null;
  starts_on: string | null;
  ends_on: string | null;
  active: boolean;
}

export interface TreasuryClosure {
  id: string;
  season_id: string;
  period_label: string;
  period_start: string;
  period_end: string;
  generated_at: string;
  generated_by: string;
  sent_to_email: string | null;
  sent_at: string | null;
  status: TreasuryClosureStatus;
  total_cents: number;
  line_count: number;
}

export interface TreasuryLine {
  id: string;
  closure_id: string;
  profile_id: string;
  profile_name: string;
  concept_id: string | null;
  source_type: string;
  source_id: string | null;
  description: string;
  amount_cents: number;
  paid: boolean;
  paid_at: string | null;
  payment_method: TreasuryPaymentMethod | null;
}

export interface TreasuryDashboard {
  concepts: TreasuryConcept[];
  assignments: TreasuryAssignment[];
  closures: TreasuryClosure[];
  latestLines: TreasuryLine[];
  playerOptions: Array<{ id: string; full_name: string }>;
}

export interface TreasuryProfileOverview {
  id: string;
  full_name: string;
  category_code: string;
  team_label: string;
  monthly_fee_cents: number;
  fee_exempt: boolean;
  billing_profile_id: string | null;
}

export async function getTreasuryProfileOverview(seasonId: string | null): Promise<{
  players: TreasuryProfileOverview[];
  payerOptions: Array<{ id: string; full_name: string }>;
}> {
  const supabase = await createClient();
  const [profilesRes, settingsRes, rostersRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, is_active")
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("treasury_profile_settings")
      .select("profile_id, monthly_fee_cents, fee_exempt, billing_profile_id"),
    seasonId
      ? supabase
          .from("team_rosters")
          .select("player_id, teams!team_rosters_team_id_fkey(label, category_code, season_id)")
          .is("left_at", null)
          .eq("teams.season_id", seasonId)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const profiles = (profilesRes.data ?? []) as Array<{ id: string; full_name: string }>;
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const settings = new Map(
    (settingsRes.data ?? []).map((setting) => [setting.profile_id, setting]),
  );
  const playerById = new Map<string, TreasuryProfileOverview>();
  for (const row of rostersRes.data ?? []) {
    const profile = profileMap.get(row.player_id);
    if (!profile) continue;
    const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
    if (!team || team.season_id !== seasonId) continue;
    const setting = settings.get(profile.id);
    if (!playerById.has(profile.id)) {
      playerById.set(profile.id, {
        id: profile.id,
        full_name: profile.full_name,
        category_code: team.category_code,
        team_label: team.label,
        monthly_fee_cents: setting?.monthly_fee_cents ?? 6000,
        fee_exempt: setting?.fee_exempt ?? false,
        billing_profile_id: setting?.billing_profile_id ?? null,
      });
    }
  }
  return {
    players: [...playerById.values()].sort((a, b) => a.full_name.localeCompare(b.full_name, "es")),
    payerOptions: profiles,
  };
}

function db(client: Awaited<ReturnType<typeof createClient>>) {
  return client as unknown as {
    from: (table: string) => {
      select: (fields: string, options?: { count?: "exact"; head?: boolean }) => unknown;
      insert: (rows: unknown) => unknown;
      update: (rows: unknown) => unknown;
      delete: () => unknown;
    };
  };
}

export async function getTreasuryDashboard(): Promise<TreasuryDashboard> {
  const supabase = await createClient();
  const raw = db(supabase);

  const [conceptsRes, assignmentsRes, closuresRes, playersRes] = await Promise.all([
    (
      raw.from("treasury_concepts").select("*") as {
        order: (
          column: string,
          options?: { ascending?: boolean },
        ) => Promise<{ data: unknown[] | null }>;
      }
    ).order("code"),
    (
      raw.from("treasury_profile_concepts").select("*") as {
        order: (
          column: string,
          options?: { ascending?: boolean },
        ) => Promise<{ data: unknown[] | null }>;
      }
    ).order("created_at", { ascending: false }),
    (
      raw.from("treasury_period_closures").select("*") as {
        order: (
          column: string,
          options?: { ascending?: boolean },
        ) => {
          limit: (count: number) => Promise<{ data: unknown[] | null }>;
        };
      }
    )
      .order("period_start", { ascending: false })
      .limit(12),
    supabase.from("profiles").select("id, full_name").order("full_name"),
  ]);

  const concepts = (conceptsRes.data ?? []) as TreasuryConcept[];
  const assignmentsRaw = (assignmentsRes.data ?? []) as Array<
    Omit<TreasuryAssignment, "profile_name" | "concept_label">
  >;
  const closuresRaw = (closuresRes.data ?? []) as Array<Omit<TreasuryClosure, "line_count">>;
  const playerOptions = (playersRes.data ?? []) as Array<{ id: string; full_name: string }>;

  const profileMap = new Map(playerOptions.map((p) => [p.id, p.full_name]));
  const conceptMap = new Map(concepts.map((c) => [c.id, c.label]));

  const closureIds = closuresRaw.map((closure) => closure.id);
  const { data: lineRows } = closureIds.length
    ? await (
        raw.from("treasury_lines").select("closure_id") as {
          in: (column: string, values: string[]) => Promise<{ data: unknown[] | null }>;
        }
      ).in("closure_id", closureIds)
    : { data: [] as unknown[] };
  const closureCounts = new Map<string, number>();
  for (const row of (lineRows ?? []) as Array<{ closure_id: string }>) {
    closureCounts.set(row.closure_id, (closureCounts.get(row.closure_id) ?? 0) + 1);
  }

  const latestClosureId = closuresRaw[0]?.id ?? null;
  const latestLines = latestClosureId ? (await getTreasuryClosure(latestClosureId)).lines : [];

  return {
    concepts,
    assignments: assignmentsRaw.map((assignment) => ({
      ...assignment,
      profile_name: profileMap.get(assignment.profile_id) ?? "Perfil",
      concept_label: conceptMap.get(assignment.concept_id) ?? "Concepto",
    })),
    closures: closuresRaw.map((closure) => ({
      ...closure,
      line_count: closureCounts.get(closure.id) ?? 0,
    })),
    latestLines,
    playerOptions,
  };
}

export async function getTreasuryClosure(id: string): Promise<{
  closure: TreasuryClosure | null;
  lines: TreasuryLine[];
}> {
  const supabase = await createClient();
  const raw = db(supabase);
  const { data: closure } = await (
    raw.from("treasury_period_closures").select("*") as {
      eq: (
        column: string,
        value: string,
      ) => { maybeSingle: () => Promise<{ data: unknown | null }> };
    }
  )
    .eq("id", id)
    .maybeSingle();
  if (!closure) return { closure: null, lines: [] };

  const { data: lineRows } = await (
    raw.from("treasury_lines").select("*") as {
      eq: (
        column: string,
        value: string,
      ) => {
        order: (
          column: string,
          options?: { ascending?: boolean },
        ) => Promise<{ data: unknown[] | null }>;
      };
    }
  )
    .eq("closure_id", id)
    .order("created_at", { ascending: true });
  const linesRaw = (lineRows ?? []) as Array<Omit<TreasuryLine, "profile_name">>;
  const profileIds = Array.from(new Set(linesRaw.map((line) => line.profile_id)));
  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", profileIds)
    : { data: [] as Array<{ id: string; full_name: string }> };
  const profileMap = new Map(
    ((profiles ?? []) as Array<{ id: string; full_name: string }>).map((p) => [p.id, p.full_name]),
  );

  return {
    closure: { ...(closure as Omit<TreasuryClosure, "line_count">), line_count: linesRaw.length },
    lines: linesRaw.map((line) => ({
      ...line,
      profile_name: profileMap.get(line.profile_id) ?? "Perfil",
    })),
  };
}

export interface FamilyTreasuryChild {
  profile_id: string;
  profile_name: string;
  photo_url: string | null;
  team_label: string | null;
  team_color: string | null;
  monthly_fee_cents: number;
}

export interface FamilyTreasuryOrder {
  id: string;
  description: string;
  amount_cents: number;
}

export interface FamilyTreasuryDebt {
  id: string;
  profile_name: string;
  description: string;
  amount_cents: number;
}

export interface FamilyTreasury {
  canView: boolean;
  totalPendingCents: number;
  currentPeriod: { label: string; start: string } | null;
  children: FamilyTreasuryChild[];
  monthlyFeeTotalCents: number;
  siblingDiscountCents: number;
  discountedFeesCents: number;
  shopOrdersTotalCents: number;
  shopOrders: FamilyTreasuryOrder[];
  olderDebtTotalCents: number;
  olderDebts: FamilyTreasuryDebt[];
}

const SIBLING_DISCOUNT_RATE = 0.2;

export async function getFamilyTreasury(profileId: string): Promise<FamilyTreasury> {
  const empty: FamilyTreasury = {
    canView: false,
    totalPendingCents: 0,
    currentPeriod: null,
    children: [],
    monthlyFeeTotalCents: 0,
    siblingDiscountCents: 0,
    discountedFeesCents: 0,
    shopOrdersTotalCents: 0,
    shopOrders: [],
    olderDebtTotalCents: 0,
    olderDebts: [],
  };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;
  const { data: own } = await supabase
    .from("profiles")
    .select("id, birth_year")
    .eq("auth_user_id", user.id)
    .eq("id", profileId)
    .maybeSingle();
  if (!own || !canViewPersonalFinances(own.birth_year)) {
    return empty;
  }
  const { data: links } = await supabase
    .from("parent_child_links")
    .select("child_profile_id")
    .eq("parent_profile_id", profileId);
  const childIds = ((links ?? []) as Array<{ child_profile_id: string }>).map(
    (l) => l.child_profile_id,
  );
  const allIds = [profileId, ...childIds];

  const admin = createAdminClient();

  const [profileRowsRes, latestClosureRes, teamRowsRes, orderRowsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, photo_url, team_color")
      .in("id", allIds),
    admin
      .from("treasury_period_closures")
      .select("id, period_label, period_start")
      .order("period_start", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("team_rosters")
      .select("player_id, teams!team_rosters_team_id_fkey(label, color, season_id)")
      .in("player_id", allIds)
      .is("left_at", null),
    (db(supabase).from("shop_orders").select("*") as {
      in: (column: string, values: string[]) => {
        in: (column: string, values: string[]) => {
          order: (
            column: string,
            options?: { ascending?: boolean },
          ) => Promise<{ data: unknown[] | null }>;
        };
      };
    })
      .in("requested_by", allIds)
      .in("status", ["pending_admin", "ordered", "received", "delivered"])
      .order("requested_at", { ascending: false }),
  ]);

  const profileMap = new Map(
    ((profileRowsRes.data ?? []) as Array<{
      id: string;
      full_name: string;
      photo_url: string | null;
      team_color: string | null;
    }>).map((p) => [p.id, p]),
  );
  const teamByPlayer = new Map<string, { label: string; color: string }>();
  for (const row of (teamRowsRes.data ?? []) as Array<{
    player_id: string;
    teams:
      | { label: string; color: string; season_id: string }
      | { label: string; color: string; season_id: string }[]
      | null;
  }>) {
    const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
    if (team) teamByPlayer.set(row.player_id, { label: team.label, color: team.color });
  }

  const latestClosure = latestClosureRes.data as {
    id: string;
    period_label: string;
    period_start: string;
  } | null;

  const children: FamilyTreasuryChild[] = [];
  for (const id of childIds.length > 0 ? childIds : [profileId]) {
    const profile = profileMap.get(id);
    if (!profile) continue;
    const team = teamByPlayer.get(id);
    children.push({
      profile_id: id,
      profile_name: profile.full_name,
      photo_url: profile.photo_url ?? null,
      team_label: team?.label ?? null,
      team_color: team?.color ?? profile.team_color ?? null,
      monthly_fee_cents: 0,
    });
  }

  if (latestClosure) {
    const { data: currentLines } = await admin
      .from("treasury_lines")
      .select("profile_id, amount_cents, concept_id, treasury_concepts(kind)")
      .eq("closure_id", latestClosure.id)
      .in("profile_id", allIds);

    const feeLinesByChild = new Map<string, number>();
    for (const raw of (currentLines ?? []) as Array<{
      profile_id: string;
      amount_cents: number;
      concept_id: string | null;
      treasury_concepts: { kind: string } | null;
    }>) {
      const kind = raw.treasury_concepts?.kind;
      if (kind !== "fee") continue;
      feeLinesByChild.set(
        raw.profile_id,
        (feeLinesByChild.get(raw.profile_id) ?? 0) + raw.amount_cents,
      );
    }

    for (const child of children) {
      child.monthly_fee_cents = feeLinesByChild.get(child.profile_id) ?? 0;
    }
  }

  const monthlyFeeTotalCents = children.reduce((sum, c) => sum + c.monthly_fee_cents, 0);
  const childrenWithFees = children.filter((c) => c.monthly_fee_cents > 0).length;
  const siblingDiscountCents =
    childrenWithFees >= 2 ? Math.round(-monthlyFeeTotalCents * SIBLING_DISCOUNT_RATE) : 0;
  const discountedFeesCents = monthlyFeeTotalCents + siblingDiscountCents;

  const shopOrders: FamilyTreasuryOrder[] = [];
  let shopOrdersTotalCents = 0;
  for (const order of (orderRowsRes.data ?? []) as Array<{
    id: string;
    total_cents: number;
    requested_at: string;
    notes: string | null;
  }>) {
    const date = new Date(order.requested_at);
    const formatted = date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
    shopOrders.push({
      id: order.id,
      description: `Pedido de tienda · ${formatted}`,
      amount_cents: order.total_cents,
    });
    shopOrdersTotalCents += order.total_cents;
  }

  const olderDebts: FamilyTreasuryDebt[] = [];
  let olderDebtTotalCents = 0;
  if (latestClosure) {
    const { data: olderLines } = await admin
      .from("treasury_lines")
      .select("id, profile_id, description, amount_cents, treasury_concepts(kind)")
      .eq("paid", false)
      .in("profile_id", allIds)
      .neq("closure_id", latestClosure.id);

    for (const raw of (olderLines ?? []) as Array<{
      id: string;
      profile_id: string;
      description: string;
      amount_cents: number;
      treasury_concepts: { kind: string } | null;
    }>) {
      if (raw.treasury_concepts?.kind !== "fee") continue;
      const profile = profileMap.get(raw.profile_id);
      olderDebts.push({
        id: raw.id,
        profile_name: profile?.full_name ?? "Familiar",
        description: raw.description,
        amount_cents: raw.amount_cents,
      });
      olderDebtTotalCents += raw.amount_cents;
    }
  }

  const totalPendingCents = discountedFeesCents + shopOrdersTotalCents + olderDebtTotalCents;

  return {
    canView: true,
    totalPendingCents,
    currentPeriod: latestClosure
      ? { label: latestClosure.period_label, start: latestClosure.period_start }
      : null,
    children: children.filter((c) => c.monthly_fee_cents > 0),
    monthlyFeeTotalCents,
    siblingDiscountCents,
    discountedFeesCents,
    shopOrdersTotalCents,
    shopOrders,
    olderDebtTotalCents,
    olderDebts,
  };
}

export function formatLineAmount(amount: number): string {
  return formatTreasuryCents(amount);
}
