"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Check, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTreasuryCents } from "@/lib/domain/treasury";
import {
  assignTreasuryConcept,
  buildTreasuryPeriodClosure,
  markTreasuryLinePaid,
  sendTreasuryClosureEmail,
  upsertTreasuryConcept,
} from "@/server/actions/admin/treasury";
import type { TreasuryDashboard, TreasuryLine } from "@/server/queries/treasury";

export function ConceptForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="border-ink-300 bg-paper-card shadow-elev-1 flex flex-col gap-2 rounded-md border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const current = e.currentTarget;
        const form = new FormData(current);
        setError(null);
        startTransition(async () => {
          try {
            await upsertTreasuryConcept({
              code: String(form.get("code") ?? ""),
              label: String(form.get("label") ?? ""),
              kind: String(form.get("kind") ?? "fee"),
              periodicity: String(form.get("periodicity") ?? "monthly"),
              applies_to: String(form.get("applies_to") ?? "specific_profile"),
              default_amount_eur: Number(form.get("default_amount_eur") ?? 0),
              active: true,
            });
            current.reset();
          } catch (err) {
            setError(err instanceof Error ? err.message : "No pudimos guardar.");
          }
        });
      }}
    >
      <FormTitle icon={<Plus className="h-4 w-4" />} title="Nuevo concepto" />
      <Input name="code" placeholder="CUOTA_MENSUAL" required />
      <Input name="label" placeholder="Cuota mensual" required />
      <div className="grid grid-cols-2 gap-2">
        <Select name="kind">
          <option value="fee">Cuota</option>
          <option value="material">Material</option>
          <option value="tournament">Torneo</option>
          <option value="adjustment">Ajuste</option>
          <option value="discount">Descuento</option>
        </Select>
        <Select name="periodicity">
          <option value="monthly">Mensual</option>
          <option value="seasonal">Temporada</option>
          <option value="one_off">Puntual</option>
        </Select>
      </div>
      <div className="grid grid-cols-[1fr_7rem] gap-2">
        <Select name="applies_to">
          <option value="specific_profile">Por perfil</option>
          <option value="all_players">Jugadores</option>
          <option value="all_members">Todo el club</option>
        </Select>
        <Input name="default_amount_eur" type="number" step="0.01" placeholder="60" required />
      </div>
      {error ? <p className="text-goggle-red text-xs font-bold">{error}</p> : null}
      <Button type="submit" variant="primary" disabled={pending}>
        Crear
      </Button>
    </form>
  );
}

export function AssignmentForm({
  concepts,
  profiles,
}: {
  concepts: TreasuryDashboard["concepts"];
  profiles: TreasuryDashboard["playerOptions"];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="border-ink-300 bg-paper-card shadow-elev-1 flex flex-col gap-2 rounded-md border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const current = e.currentTarget;
        const form = new FormData(current);
        setError(null);
        startTransition(async () => {
          try {
            const amount = String(form.get("amount_eur") ?? "");
            await assignTreasuryConcept({
              profile_id: String(form.get("profile_id") ?? ""),
              concept_id: String(form.get("concept_id") ?? ""),
              amount_eur: amount ? Number(amount) : null,
              starts_on: String(form.get("starts_on") ?? "") || null,
              ends_on: String(form.get("ends_on") ?? "") || null,
              active: true,
            });
            current.reset();
          } catch (err) {
            setError(err instanceof Error ? err.message : "No pudimos asignar.");
          }
        });
      }}
    >
      <FormTitle icon={<Banknote className="h-4 w-4" />} title="Asignar concepto" />
      <Select name="profile_id" required>
        <option value="">Perfil</option>
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.full_name}
          </option>
        ))}
      </Select>
      <Select name="concept_id" required>
        <option value="">Concepto</option>
        {concepts.map((concept) => (
          <option key={concept.id} value={concept.id}>
            {concept.label}
          </option>
        ))}
      </Select>
      <div className="grid grid-cols-3 gap-2">
        <Input name="amount_eur" type="number" step="0.01" placeholder="Importe" />
        <Input name="starts_on" type="date" />
        <Input name="ends_on" type="date" />
      </div>
      {error ? <p className="text-goggle-red text-xs font-bold">{error}</p> : null}
      <Button type="submit" variant="secondary" disabled={pending}>
        Asignar
      </Button>
    </form>
  );
}

export function ClosureForm({ seasonId }: { seasonId: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  return (
    <form
      className="border-pool-blue/25 bg-pool-foam/55 shadow-elev-1 flex flex-col gap-2 rounded-md border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!seasonId) {
          setError("No hay temporada activa.");
          return;
        }
        const form = new FormData(e.currentTarget);
        setError(null);
        startTransition(async () => {
          try {
            const result = await buildTreasuryPeriodClosure({
              season_id: seasonId,
              period_start: String(form.get("period_start") ?? ""),
              period_end: String(form.get("period_end") ?? ""),
              sent_to_email: String(form.get("sent_to_email") ?? "") || null,
            });
            router.push(`/admin/treasury/closures/${result.id}` as never);
          } catch (err) {
            setError(err instanceof Error ? err.message : "No pudimos generar.");
          }
        });
      }}
    >
      <FormTitle icon={<Check className="h-4 w-4" />} title="Generar cierre" />
      <div className="grid grid-cols-2 gap-2">
        <Input name="period_start" type="date" defaultValue={start} required />
        <Input name="period_end" type="date" defaultValue={end} required />
      </div>
      <Input name="sent_to_email" type="email" placeholder="Email tesoreria" />
      {error ? <p className="text-goggle-red text-xs font-bold">{error}</p> : null}
      <Button type="submit" variant="primary" disabled={pending || !seasonId}>
        Generar cierre
      </Button>
    </form>
  );
}

export function PaidButton({ lineId, paid }: { lineId: string; paid: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await markTreasuryLinePaid({
            line_id: lineId,
            paid: !paid,
            payment_method: "bank_transfer",
          });
        });
      }}
      className={
        "inline-flex h-9 shrink-0 items-center justify-center rounded-md px-3 text-xs font-extrabold " +
        (paid ? "bg-success/10 text-success" : "bg-paper-sunk text-pool-deep")
      }
    >
      {paid ? "Pagado" : "Marcar"}
    </button>
  );
}

export function SendClosureEmailButton({
  closureId,
  sentToEmail,
}: {
  closureId: string;
  sentToEmail: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-2 flex flex-col gap-1">
      <Button
        type="button"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          setError(null);
          startTransition(async () => {
            try {
              await sendTreasuryClosureEmail({ closure_id: closureId, to: sentToEmail });
              setMessage("Cierre enviado.");
            } catch (err) {
              setError(err instanceof Error ? err.message : "No pudimos enviar el cierre.");
            }
          });
        }}
      >
        {pending ? "Enviando..." : "Enviar a tesoreria"}
      </Button>
      {message ? <p className="text-success text-xs font-bold">{message}</p> : null}
      {error ? <p className="text-goggle-red text-xs font-bold">{error}</p> : null}
    </div>
  );
}

export function LinesPreview({ lines }: { lines: TreasuryLine[] }) {
  if (lines.length === 0) {
    return (
      <p className="border-ink-300 bg-paper text-ink-600 rounded-md border border-dashed p-4 text-sm font-semibold">
        Genera un cierre para ver las lineas de cobro.
      </p>
    );
  }

  return (
    <ul className="divide-ink-200 border-ink-300 bg-paper-card shadow-elev-1 flex flex-col divide-y rounded-md border p-2">
      {lines.slice(0, 12).map((line) => (
        <li key={line.id} className="flex min-h-14 items-center gap-2 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-pool-deep line-clamp-1 text-sm font-extrabold">
              {line.profile_name}
            </p>
            <p className="text-ink-600 line-clamp-1 text-xs font-semibold">{line.description}</p>
          </div>
          <span className="text-pool-deep font-mono text-sm font-extrabold">
            {formatTreasuryCents(line.amount_cents)}
          </span>
          <PaidButton lineId={line.id} paid={line.paid} />
        </li>
      ))}
    </ul>
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="border-ink-300 bg-paper text-pool-deep h-12 min-w-0 rounded border px-3 text-sm font-semibold"
    />
  );
}

function FormTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="text-pool-deep flex items-center gap-2 text-sm font-extrabold">
      {icon}
      {title}
    </div>
  );
}
