"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatTreasuryCents } from "@/lib/domain/treasury";
import {
  setTreasuryAssignmentActive,
  setTreasuryConceptActive,
} from "@/server/actions/admin/treasury";
import type { TreasuryAssignment, TreasuryConcept } from "@/server/queries/treasury";

export function TreasuryMaintenance({
  concepts: initialConcepts,
  assignments: initialAssignments,
}: {
  concepts: TreasuryConcept[];
  assignments: TreasuryAssignment[];
}) {
  const [concepts, setConcepts] = useState(initialConcepts);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function changeConcept(concept: TreasuryConcept) {
    setError(null);
    setPendingId(concept.id);
    startTransition(async () => {
      try {
        await setTreasuryConceptActive({ concept_id: concept.id, active: !concept.active });
        setConcepts((items) => items.map((item) => item.id === concept.id ? { ...item, active: !item.active } : item));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No pudimos actualizar el concepto.");
      } finally {
        setPendingId(null);
      }
    });
  }

  function changeAssignment(assignment: TreasuryAssignment) {
    setError(null);
    setPendingId(assignment.id);
    startTransition(async () => {
      try {
        await setTreasuryAssignmentActive({ assignment_id: assignment.id, active: !assignment.active });
        setAssignments((items) => items.map((item) => item.id === assignment.id ? { ...item, active: !item.active } : item));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No pudimos actualizar la asignación.");
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="treasury-maintenance-title">
      <div>
        <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">Mantenimiento</p>
        <h2 id="treasury-maintenance-title" className="text-pool-deep text-xl font-extrabold">Conceptos y asignaciones</h2>
        <p className="text-ink-600 mt-1 text-sm">Desactiva lo que ya no deba entrar en los próximos cierres; el historial se conserva.</p>
      </div>
      {error ? <p role="alert" className="border-danger/25 bg-danger/5 text-danger rounded-xl border p-3 text-sm font-semibold">{error}</p> : null}
      <div className="grid gap-3 lg:grid-cols-2">
        <MaintenanceList title="Conceptos" empty="Todavía no hay conceptos." items={concepts} render={(concept) => (
          <MaintenanceRow key={concept.id} title={concept.label} detail={`${concept.code} · ${concept.periodicity} · ${concept.default_amount_cents == null ? "Importe variable" : formatTreasuryCents(concept.default_amount_cents)}`} active={concept.active} pending={pendingId === concept.id} onChange={() => changeConcept(concept)} />
        )} />
        <MaintenanceList title="Asignaciones" empty="Todavía no hay asignaciones." items={assignments} render={(assignment) => (
          <MaintenanceRow key={assignment.id} title={assignment.profile_name} detail={`${assignment.concept_label}${assignment.amount_cents == null ? "" : ` · ${formatTreasuryCents(assignment.amount_cents)}`}`} active={assignment.active} pending={pendingId === assignment.id} onChange={() => changeAssignment(assignment)} />
        )} />
      </div>
    </section>
  );
}

function MaintenanceList<T>({ title, empty, items, render }: { title: string; empty: string; items: T[]; render: (item: T) => React.ReactNode }) {
  return <div className="border-ink-200 bg-paper-card rounded-2xl border p-3"><h3 className="text-pool-deep flex items-center gap-2 font-extrabold"><UsersRound className="h-4 w-4" aria-hidden="true" />{title}</h3><ul className="divide-ink-200 mt-2 divide-y">{items.length ? items.map(render) : <li className="text-ink-600 py-4 text-sm font-semibold">{empty}</li>}</ul></div>;
}

function MaintenanceRow({ title, detail, active, pending, onChange }: { title: string; detail: string; active: boolean; pending: boolean; onChange: () => void }) {
  return <li className="flex min-h-14 items-center gap-2 py-2"><div className="min-w-0 flex-1"><p className="text-pool-deep truncate text-sm font-extrabold">{title}</p><p className="text-ink-600 truncate text-xs font-semibold">{detail}</p></div><Button type="button" variant="outline" size="icon" disabled={pending} onClick={onChange} aria-label={active ? `Desactivar ${title}` : `Activar ${title}`}>{active ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}</Button></li>;
}
