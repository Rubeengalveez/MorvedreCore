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
import { requirePermission } from "./_helpers";

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
  await requirePermission("manage_treasury");
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
  await requirePermission("manage_treasury");
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

export async function upsertTreasuryProfileSettings(input: {
  profile_id: string;
  monthly_fee_eur: number;
  fee_exempt: boolean;
  billing_profile_id?: string | null;
}): Promise<void> {
  const me = await requirePermission("manage_treasury");
  const parsed = z
    .object({
      profile_id: z.string().uuid(),
      monthly_fee_eur: z.number().min(0).max(1000),
      fee_exempt: z.boolean(),
      billing_profile_id: z.string().uuid().nullable().optional(),
    })
    .safeParse(input);
  if (!parsed.success) throw new Error("Revisa los datos de pago.");
  const admin = createAdminClient();
  const { error } = await admin.from("treasury_profile_settings").upsert(
    {
      profile_id: parsed.data.profile_id,
      monthly_fee_cents: eurosToCents(parsed.data.monthly_fee_eur),
      fee_exempt: parsed.data.fee_exempt,
      billing_profile_id: parsed.data.billing_profile_id ?? null,
      updated_by: me.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id" },
  );
  if (error) throw new Error("No pudimos guardar la configuración de pago.");
  revalidatePath("/admin/treasury");
}

export async function buildTreasuryPeriodClosure(input: {
  season_id: string;
  period_start: string;
  period_end: string;
  sent_to_email?: string | null;
}): Promise<{ id: string; total_cents: number; line_count: number }> {
  const me = await requirePermission("manage_treasury");
  const parsed = buildTreasuryClosureSchema.safeParse(input);
  if (!parsed.success) throw new Error(toError(parsed.error));
  const admin = createAdminClient();
  const raw = db(admin);

  const [conceptsRes, assignmentsRes, profilesRes, rostersRes, shopOrdersRes, settingsRes] =
    await Promise.all([
      raw.from("treasury_concepts").select("*") as Promise<{
        data: unknown[] | null;
        error: Error | null;
      }>,
      raw.from("treasury_profile_concepts").select("*") as Promise<{
        data: unknown[] | null;
        error: Error | null;
      }>,
      admin.from("profiles").select("id, full_name, is_active").eq("is_active", true),
      admin.from("team_rosters").select("player_id").is("left_at", null),
      admin
        .from("shop_orders")
        .select("id, requested_by, total_cents, requested_at, status")
        .gte("requested_at", `${parsed.data.period_start}T00:00:00.000Z`)
        .lte("requested_at", `${parsed.data.period_end}T23:59:59.999Z`),
      admin
        .from("treasury_profile_settings")
        .select("profile_id, monthly_fee_cents, fee_exempt, billing_profile_id"),
    ]);

  if (conceptsRes.error)
    throw new Error("No pudimos cargar conceptos: " + errorMessage(conceptsRes.error));
  if (assignmentsRes.error)
    throw new Error("No pudimos cargar asignaciones: " + errorMessage(assignmentsRes.error));

  const playerIds = new Set(
    ((rostersRes.data ?? []) as Array<{ player_id: string }>).map((r) => r.player_id),
  );
  const profiles = (
    (profilesRes.data ?? []) as Array<{ id: string; full_name: string; is_active: boolean }>
  ).map<TreasuryProfileInput>((p) => ({
    id: p.id,
    full_name: p.full_name,
    is_player: playerIds.has(p.id),
  }));

  const settings = new Map(
    (settingsRes.data ?? []).map((setting) => [setting.profile_id, setting]),
  );
  const draft = buildPeriodClosure({
    periodStart: parsed.data.period_start,
    periodEnd: parsed.data.period_end,
    concepts: ((conceptsRes.data ?? []) as TreasuryConceptInput[]).filter(
      (concept) =>
        !(
          concept.kind === "fee" &&
          concept.periodicity === "monthly" &&
          concept.applies_to === "all_players"
        ),
    ),
    assignments: (assignmentsRes.data ?? []) as TreasuryAssignmentInput[],
    profiles,
    shopOrders: (shopOrdersRes.data ?? []) as TreasuryShopOrderInput[],
  });
  const profileName = new Map(profiles.map((profile) => [profile.id, profile.full_name]));
  const feeLines = profiles
    .filter((profile) => profile.is_player)
    .flatMap((profile) => {
      const setting = settings.get(profile.id);
      if (setting?.fee_exempt) return [];
      const amount = setting?.monthly_fee_cents ?? 6000;
      if (amount <= 0) return [];
      return [
        {
          profile_id: profile.id,
          concept_id: null,
          source_type: "monthly_fee" as const,
          source_id: null,
          description: "Cuota mensual",
          amount_cents: amount,
        },
      ];
    });
  const lines = [...feeLines, ...draft.lines].map((line) => {
    const payerId = settings.get(line.profile_id)?.billing_profile_id ?? line.profile_id;
    return {
      ...line,
      profile_id: payerId,
      description:
        payerId === line.profile_id
          ? line.description
          : `${line.description} · ${profileName.get(line.profile_id) ?? "Jugador"}`,
    };
  });
  const totalCents = lines.reduce((total, line) => total + line.amount_cents, 0);

  const closurePayload = {
    season_id: parsed.data.season_id,
    period_label: monthLabel(parsed.data.period_start),
    period_start: parsed.data.period_start,
    period_end: parsed.data.period_end,
    generated_by: me.id,
    sent_to_email: parsed.data.sent_to_email ?? null,
    status: "draft",
    total_cents: totalCents,
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

  if (lines.length > 0) {
    const { error: linesErr } = await (raw.from("treasury_lines").insert(
      lines.map((line) => ({
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
  return { id: closure.id, total_cents: totalCents, line_count: lines.length };
}

export async function markTreasuryLinePaid(input: {
  line_id: string;
  paid: boolean;
  paid_at?: string | null;
  payment_method?: string | null;
}): Promise<void> {
  await requirePermission("manage_treasury");
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
  await requirePermission("manage_treasury");
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
