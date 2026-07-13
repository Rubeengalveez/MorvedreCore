"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { escapeHtml } from "@/lib/email/html";
import {
  buildTreasuryClosureWorkbook,
  treasuryClosureFilename,
} from "@/lib/exports/treasury-export";
import {
  assignTreasuryConceptSchema,
  buildTreasuryClosureSchema,
  markTreasuryLinePaidSchema,
  upsertTreasuryConceptSchema,
} from "@/lib/domain/admin-schemas";
import {
  buildPeriodClosure,
  eurosToCents,
  monthLabel,
  type TreasuryAssignmentInput,
  type TreasuryConceptInput,
  type TreasuryProfileInput,
  type TreasuryShopOrderInput,
} from "@/lib/domain/treasury";
import { getTreasuryClosure } from "@/server/queries/treasury";
import { requireAdmin } from "./_helpers";

function toError(e: unknown): string {
  if (e instanceof z.ZodError) {
    const issue = (e as z.ZodError).issues[0] as { message?: string } | undefined;
    return issue?.message ?? "Datos invalidos.";
  }
  if (e instanceof Error) return e.message;
  return "Ha habido un problema.";
}

function errorMessage(error: Error | { message?: string } | null | undefined): string {
  return error?.message ?? "sin detalle";
}

function db(client: ReturnType<typeof createAdminClient>) {
  return client as unknown as {
    from: (table: string) => {
      select: (fields: string) => unknown;
      insert: (rows: unknown) => unknown;
      update: (rows: unknown) => unknown;
      upsert: (rows: unknown, options?: unknown) => unknown;
      delete: () => unknown;
    };
  };
}

export async function upsertTreasuryConcept(input: {
  concept_id?: string;
  code: string;
  label: string;
  kind: string;
  periodicity: string;
  default_amount_eur?: number | null;
  applies_to: string;
  active?: boolean;
}): Promise<void> {
  await requireAdmin();
  const parsed = upsertTreasuryConceptSchema.safeParse(input);
  if (!parsed.success) throw new Error(toError(parsed.error));
  const admin = createAdminClient();
  const payload = {
    code: parsed.data.code.trim().toUpperCase(),
    label: parsed.data.label.trim(),
    kind: parsed.data.kind,
    periodicity: parsed.data.periodicity,
    default_amount_cents:
      parsed.data.default_amount_eur == null ? null : eurosToCents(parsed.data.default_amount_eur),
    applies_to: parsed.data.applies_to,
    active: parsed.data.active,
  };

  const raw = db(admin);
  const result = parsed.data.concept_id
    ? await (
        raw.from("treasury_concepts").update(payload) as {
          eq: (column: string, value: string) => Promise<{ error: Error | null }>;
        }
      ).eq("id", parsed.data.concept_id)
    : await (raw.from("treasury_concepts").insert(payload) as Promise<{ error: Error | null }>);
  if (result.error)
    throw new Error("No pudimos guardar el concepto: " + errorMessage(result.error));

  revalidatePath("/admin/treasury");
}

export async function assignTreasuryConcept(input: {
  profile_id: string;
  concept_id: string;
  amount_eur?: number | null;
  starts_on?: string | null;
  ends_on?: string | null;
  active?: boolean;
}): Promise<void> {
  await requireAdmin();
  const parsed = assignTreasuryConceptSchema.safeParse(input);
  if (!parsed.success) throw new Error(toError(parsed.error));
  const admin = createAdminClient();
  const raw = db(admin);
  const { error } = await (raw.from("treasury_profile_concepts").upsert(
    {
      profile_id: parsed.data.profile_id,
      concept_id: parsed.data.concept_id,
      amount_cents: parsed.data.amount_eur == null ? null : eurosToCents(parsed.data.amount_eur),
      starts_on: parsed.data.starts_on ?? null,
      ends_on: parsed.data.ends_on ?? null,
      active: parsed.data.active,
    },
    { onConflict: "profile_id,concept_id" },
  ) as Promise<{ error: Error | null }>);
  if (error) throw new Error("No pudimos asignar el concepto: " + errorMessage(error));
  revalidatePath("/admin/treasury");
}

export async function buildTreasuryPeriodClosure(input: {
  season_id: string;
  period_start: string;
  period_end: string;
  sent_to_email?: string | null;
}): Promise<{ id: string; total_cents: number; line_count: number }> {
  const me = await requireAdmin();
  const parsed = buildTreasuryClosureSchema.safeParse(input);
  if (!parsed.success) throw new Error(toError(parsed.error));
  const admin = createAdminClient();
  const raw = db(admin);

  const [conceptsRes, assignmentsRes, profilesRes, rostersRes, shopOrdersRes] = await Promise.all([
    raw.from("treasury_concepts").select("*") as Promise<{
      data: unknown[] | null;
      error: Error | null;
    }>,
    raw.from("treasury_profile_concepts").select("*") as Promise<{
      data: unknown[] | null;
      error: Error | null;
    }>,
    admin.from("profiles").select("id, full_name"),
    admin.from("team_rosters").select("player_id").is("left_at", null),
    admin
      .from("shop_orders")
      .select("id, requested_by, total_cents, requested_at, status")
      .gte("requested_at", `${parsed.data.period_start}T00:00:00.000Z`)
      .lte("requested_at", `${parsed.data.period_end}T23:59:59.999Z`),
  ]);

  if (conceptsRes.error)
    throw new Error("No pudimos cargar conceptos: " + errorMessage(conceptsRes.error));
  if (assignmentsRes.error)
    throw new Error("No pudimos cargar asignaciones: " + errorMessage(assignmentsRes.error));

  const playerIds = new Set(
    ((rostersRes.data ?? []) as Array<{ player_id: string }>).map((r) => r.player_id),
  );
  const profiles = (
    (profilesRes.data ?? []) as Array<{ id: string; full_name: string }>
  ).map<TreasuryProfileInput>((p) => ({
    id: p.id,
    full_name: p.full_name,
    is_player: playerIds.has(p.id),
  }));

  const draft = buildPeriodClosure({
    periodStart: parsed.data.period_start,
    periodEnd: parsed.data.period_end,
    concepts: (conceptsRes.data ?? []) as TreasuryConceptInput[],
    assignments: (assignmentsRes.data ?? []) as TreasuryAssignmentInput[],
    profiles,
    shopOrders: (shopOrdersRes.data ?? []) as TreasuryShopOrderInput[],
  });

  const closurePayload = {
    season_id: parsed.data.season_id,
    period_label: monthLabel(parsed.data.period_start),
    period_start: parsed.data.period_start,
    period_end: parsed.data.period_end,
    generated_by: me.id,
    sent_to_email: parsed.data.sent_to_email ?? null,
    status: "draft",
    total_cents: draft.total_cents,
  };
  const { data: closure, error: closureErr } = await (
    raw
      .from("treasury_period_closures")
      .upsert(closurePayload, { onConflict: "season_id,period_start,period_end" }) as {
      select: (fields: string) => {
        single: () => Promise<{ data: { id: string } | null; error: Error | null }>;
      };
    }
  )
    .select("id")
    .single();
  if (closureErr || !closure) {
    throw new Error("No pudimos generar el cierre: " + errorMessage(closureErr));
  }

  await (
    raw.from("treasury_lines").delete() as {
      eq: (column: string, value: string) => Promise<{ error: Error | null }>;
    }
  ).eq("closure_id", closure.id);

  if (draft.lines.length > 0) {
    const { error: linesErr } = await (raw.from("treasury_lines").insert(
      draft.lines.map((line) => ({
        closure_id: closure.id,
        profile_id: line.profile_id,
        concept_id: line.concept_id,
        source_type: line.source_type,
        source_id: line.source_id,
        description: line.description,
        amount_cents: line.amount_cents,
      })),
    ) as Promise<{ error: Error | null }>);
    if (linesErr) throw new Error("No pudimos guardar las lineas: " + errorMessage(linesErr));
  }

  revalidatePath("/admin/treasury");
  revalidatePath(`/admin/treasury/closures/${closure.id}`);
  revalidatePath("/treasury");
  return { id: closure.id, total_cents: draft.total_cents, line_count: draft.lines.length };
}

export async function markTreasuryLinePaid(input: {
  line_id: string;
  paid: boolean;
  paid_at?: string | null;
  payment_method?: string | null;
}): Promise<void> {
  await requireAdmin();
  const parsed = markTreasuryLinePaidSchema.safeParse(input);
  if (!parsed.success) throw new Error(toError(parsed.error));
  const admin = createAdminClient();
  const raw = db(admin);
  const { error } = await (
    raw.from("treasury_lines").update({
      paid: parsed.data.paid,
      paid_at: parsed.data.paid
        ? (parsed.data.paid_at ?? new Date().toISOString().slice(0, 10))
        : null,
      payment_method: parsed.data.paid ? (parsed.data.payment_method ?? "bank_transfer") : null,
    }) as {
      eq: (column: string, value: string) => Promise<{ error: Error | null }>;
    }
  ).eq("id", parsed.data.line_id);
  if (error) throw new Error("No pudimos actualizar el pago: " + errorMessage(error));
  revalidatePath("/admin/treasury");
  revalidatePath("/treasury");
}

export async function sendTreasuryClosureEmail(input: {
  closure_id: string;
  to?: string | null;
}): Promise<void> {
  await requireAdmin();
  const to = input.to?.trim() || process.env.TREASURY_EMAIL || process.env.ADMIN_EMAIL;
  if (!to) throw new Error("Falta configurar el email de tesoreria.");

  const { closure, lines } = await getTreasuryClosure(input.closure_id);
  if (!closure) throw new Error("No encontramos el cierre.");

  const buffer = buildTreasuryClosureWorkbook({ closure, lines });
  const filename = treasuryClosureFilename(closure.period_label);
  const safePeriodLabel = escapeHtml(closure.period_label);
  const result = await sendEmail({
    to,
    subject: `Cierre de tesoreria - ${closure.period_label}`,
    text: `Hola,

Adjunto tienes el cierre de tesoreria de ${closure.period_label}.

Total: ${closure.total_cents / 100} EUR
Lineas: ${lines.length}
`,
    html: `<p>Hola,</p>
<p>Adjunto tienes el cierre de tesoreria de <strong>${safePeriodLabel}</strong>.</p>
<ul>
  <li><strong>Total:</strong> ${(closure.total_cents / 100).toFixed(2)} EUR</li>
  <li><strong>Lineas:</strong> ${lines.length}</li>
</ul>`,
    attachments: [
      {
        filename,
        content: buffer.toString("base64"),
      },
    ],
  });

  if (!result.success) throw new Error(result.error ?? "No pudimos enviar el cierre.");

  const admin = createAdminClient();
  const raw = db(admin);
  const { error } = await (
    raw.from("treasury_period_closures").update({
      sent_to_email: to,
      sent_at: new Date().toISOString(),
      status: "sent",
    }) as {
      eq: (column: string, value: string) => Promise<{ error: Error | null }>;
    }
  ).eq("id", closure.id);
  if (error) throw new Error("El email se envio, pero no pudimos marcar el cierre como enviado.");

  revalidatePath("/admin/treasury");
  revalidatePath(`/admin/treasury/closures/${closure.id}`);
}
