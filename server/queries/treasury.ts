import { createClient } from "@/lib/supabase/server";
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

export async function getFamilyTreasury(profileId: string): Promise<{
  totalPendingCents: number;
  lines: TreasuryLine[];
}> {
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("parent_child_links")
    .select("child_profile_id")
    .eq("parent_profile_id", profileId);
  const profileIds = [
    profileId,
    ...((links ?? []) as Array<{ child_profile_id: string }>).map((l) => l.child_profile_id),
  ];
  const raw = db(supabase);
  const { data: lineRows } = await (
    raw.from("treasury_lines").select("*") as {
      in: (
        column: string,
        values: string[],
      ) => {
        eq: (
          column: string,
          value: boolean,
        ) => {
          order: (
            column: string,
            options?: { ascending?: boolean },
          ) => Promise<{ data: unknown[] | null }>;
        };
      };
    }
  )
    .in("profile_id", profileIds)
    .eq("paid", false)
    .order("created_at", { ascending: false });

  const linesRaw = (lineRows ?? []) as Array<Omit<TreasuryLine, "profile_name">>;
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", Array.from(new Set(linesRaw.map((line) => line.profile_id))));
  const profileMap = new Map(
    ((profiles ?? []) as Array<{ id: string; full_name: string }>).map((p) => [p.id, p.full_name]),
  );
  const lines: TreasuryLine[] = linesRaw.map((line) => ({
    ...line,
    profile_name: profileMap.get(line.profile_id) ?? "Perfil",
  }));

  return {
    totalPendingCents: lines.reduce((acc, line) => acc + line.amount_cents, 0),
    lines,
  };
}

export function formatLineAmount(amount: number): string {
  return formatTreasuryCents(amount);
}
