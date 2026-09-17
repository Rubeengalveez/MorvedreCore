"use client";

import { useState, useTransition } from "react";
import {
  CalendarDays,
  CheckCircle2,
  CircleUserRound,
  Loader2,
  Mail,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmActionSheet } from "@/components/ui/confirm-action-sheet";
import { StatusBadge } from "@/components/ui/badge";
import {
  approveAccessRequest,
  rejectAccessRequest,
  type IssuedCredential,
} from "@/server/actions/auth";

interface ChildRef {
  child_profile_id: string;
  child?: { id: string; full_name: string } | null;
}

interface AccessRequest {
  id: string;
  email: string;
  full_name: string;
  role: string;
  birth_year: number | null;
  gender: string | null;
  relation: string | null;
  status: string;
  candidate?: { id: string; full_name: string } | null;
  children?: ChildRef[] | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  player: "Jugador/a",
  parent: "Padre o madre",
  coach: "Entrenador/a",
  delegate: "Delegado/a",
  directiva: "Directiva",
  admin: "Administración",
};

const RELATION_LABELS: Record<string, string> = {
  mother: "Madre",
  father: "Padre",
  legal_guardian: "Tutor/a legal",
  other: "Otro vínculo",
};

const GENDER_LABELS: Record<string, string> = {
  male: "Masculino",
  female: "Femenino",
  other: "Otro",
  prefer_not_to_say: "Prefiere no indicarlo",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function AccessRequestsManager({ initialRequests }: { initialRequests: AccessRequest[] }) {
  const [requests, setRequests] = useState<AccessRequest[]>(initialRequests);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [issuedCredentials, setIssuedCredentials] = useState<IssuedCredential[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rejectRequest, setRejectRequest] = useState<AccessRequest | null>(null);
  const [, startTransition] = useTransition();

  const pendingRequests = requests.filter((request) => request.status === "pending");
  const history = requests.filter((request) => request.status !== "pending");

  function approve(request: AccessRequest) {
    setError(null);
    setPendingId(request.id);
    const formData = new FormData();
    formData.append("requestId", request.id);
    startTransition(async () => {
      const result = await approveAccessRequest(formData);
      setPendingId(null);
      if (!result?.success) {
        setError(result?.error ?? "No pudimos aprobar la solicitud.");
        return;
      }
      setIssuedCredentials(result.credentials ?? []);
      setRequests((items) =>
        items.map((item) => (item.id === request.id ? { ...item, status: "approved" } : item)),
      );
    });
  }

  function reject(request: AccessRequest) {
    setError(null);
    setPendingId(request.id);
    const formData = new FormData();
    formData.append("requestId", request.id);
    startTransition(async () => {
      const result = await rejectAccessRequest(formData);
      setPendingId(null);
      if (!result?.success) {
        setError(result?.error ?? "No pudimos rechazar la solicitud.");
        return;
      }
      setRequests((items) => items.filter((item) => item.id !== request.id));
      setRejectRequest(null);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <ConfirmActionSheet
        open={rejectRequest !== null}
        onOpenChange={(open) => {
          if (!open) setRejectRequest(null);
        }}
        title="Rechazar solicitud"
        description={
          rejectRequest
            ? `${rejectRequest.full_name} no recibirá acceso al club. Podrá hacer una nueva solicitud si corresponde.`
            : ""
        }
        confirmLabel="Rechazar solicitud"
        isPending={pendingId === rejectRequest?.id}
        error={error}
        onConfirm={() => {
          if (rejectRequest) reject(rejectRequest);
        }}
      />

      <section className="bg-pool-deep text-paper relative overflow-hidden rounded-2xl p-4 shadow-elev-1">
        <span className="lane-pattern absolute inset-0 opacity-15" aria-hidden="true" />
        <div className="relative flex items-start gap-3">
          <span className="bg-paper/12 text-ball-gold flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-ball-gold text-xs font-extrabold tracking-[0.12em] uppercase">Revisión de accesos</p>
            <h2 className="mt-1 text-xl font-extrabold">{pendingRequests.length} por revisar</h2>
            <p className="text-paper/75 mt-1 text-sm">Comprueba los datos y aprueba una solicitud cada vez. Al aprobar, se generan las credenciales temporales.</p>
          </div>
        </div>
      </section>

      {error ? <p role="alert" className="border-danger/25 bg-danger/5 text-danger rounded-xl border p-3 text-sm font-semibold">{error}</p> : null}

      {issuedCredentials.length > 0 ? (
        <section className="border-success/25 bg-success/5 rounded-2xl border p-4" role="status" aria-live="polite">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-success text-xs font-extrabold tracking-[0.12em] uppercase">Acceso aprobado</p>
              <h2 className="text-pool-deep mt-1 text-lg font-extrabold">Credenciales temporales</h2>
              <p className="text-ink-700 mt-1 text-sm">Cópialas ahora y compártelas de forma privada. No volverán a mostrarse.</p>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={() => setIssuedCredentials([])}>Ocultar</Button>
          </div>
          <ul className="mt-4 flex flex-col gap-2">
            {issuedCredentials.map((credential) => (
              <li key={credential.email} className="border-success/20 bg-paper rounded-xl border p-3">
                <p className="text-pool-deep break-all text-sm font-extrabold">{credential.email}</p>
                <code className="text-ink-700 mt-1 block break-all font-mono text-sm font-bold">{credential.temporaryPassword}</code>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="pending-access-title" className="flex flex-col gap-3">
        <div>
          <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">Bandeja de entrada</p>
          <h2 id="pending-access-title" className="text-pool-deep mt-1 text-xl font-extrabold">Solicitudes pendientes</h2>
        </div>
        {pendingRequests.length === 0 ? (
          <Card className="items-center gap-2 border-dashed p-7 text-center">
            <CheckCircle2 className="text-success h-8 w-8" aria-hidden="true" />
            <p className="text-pool-deep font-extrabold">No hay accesos pendientes</p>
            <p className="text-ink-600 text-sm">Las nuevas solicitudes aparecerán aquí para revisarlas una a una.</p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {pendingRequests.map((request) => (
              <li key={request.id}>
                <AccessRequestCard request={request} pending={pendingId === request.id} onApprove={() => approve(request)} onReject={() => setRejectRequest(request)} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {history.length > 0 ? (
        <section aria-labelledby="access-history-title" className="flex flex-col gap-2">
          <div>
            <p className="text-ink-500 text-xs font-extrabold tracking-[0.12em] uppercase">Registro</p>
            <h2 id="access-history-title" className="text-pool-deep mt-1 text-lg font-extrabold">Solicitudes resueltas</h2>
          </div>
          <Card className="divide-ink-200 divide-y">
            {history.map((request) => (
              <div key={request.id} className="flex min-h-16 items-center gap-3 p-3">
                <CircleUserRound className="text-ink-400 h-7 w-7 shrink-0" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-pool-deep truncate text-sm font-extrabold">{request.full_name}</p>
                  <p className="text-ink-600 truncate text-xs">{request.email}</p>
                </div>
                <StatusBadge variant={request.status === "activated" ? "success" : "info"} dot>
                  {request.status === "activated" ? "Activada" : "Aprobada"}
                </StatusBadge>
              </div>
            ))}
          </Card>
        </section>
      ) : null}
    </div>
  );
}

function AccessRequestCard({ request, pending, onApprove, onReject }: { request: AccessRequest; pending: boolean; onApprove: () => void; onReject: () => void }) {
  const children = request.children?.map((child) => child.child?.full_name ?? child.child_profile_id) ?? [];
  return (
    <Card accentColor="var(--pool-blue)" className="gap-0">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-start gap-3">
          <span className="bg-pool-foam text-pool-deep flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"><CircleUserRound className="h-6 w-6" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h3 className="text-pool-deep text-lg leading-tight font-extrabold">{request.full_name}</h3><StatusBadge variant="info">Solicita acceso como {ROLE_LABELS[request.role] ?? request.role}</StatusBadge></div>
            <p className="text-ink-600 mt-1 inline-flex items-center gap-1.5 text-sm"><Mail className="h-4 w-4" aria-hidden="true" />{request.email}</p>
          </div>
        </div>
        <dl className="bg-paper-sunk/70 grid grid-cols-1 gap-x-4 gap-y-3 rounded-xl p-3 text-sm min-[420px]:grid-cols-2">
          <RequestDetail icon={<CalendarDays className="h-4 w-4" />} label="Solicitado" value={formatDate(request.created_at)} />
          {request.birth_year ? <RequestDetail label="Año de nacimiento" value={String(request.birth_year)} /> : null}
          {request.gender ? <RequestDetail label="Género" value={GENDER_LABELS[request.gender] ?? request.gender} /> : null}
          {request.relation ? <RequestDetail label="Vínculo" value={RELATION_LABELS[request.relation] ?? request.relation} /> : null}
        </dl>
        {request.candidate ? <div className="border-pool-blue/20 bg-pool-foam/55 rounded-xl border p-3"><p className="text-pool-blue text-xs font-extrabold tracking-[0.1em] uppercase">Perfil indicado</p><p className="text-pool-deep mt-1 text-sm font-extrabold">{request.candidate.full_name}</p></div> : null}
        {children.length > 0 ? <div className="border-ink-200 flex gap-2 rounded-xl border p-3"><UsersRound className="text-pool-blue mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /><div><p className="text-ink-500 text-xs font-extrabold tracking-[0.1em] uppercase">Hijos o hijas vinculados</p><p className="text-pool-deep mt-1 text-sm font-extrabold">{children.join(", ")}</p></div></div> : null}
      </div>
      <div className="border-ink-200 grid grid-cols-1 gap-2 border-t p-3 min-[420px]:grid-cols-[1fr_auto]">
        <Button type="button" variant="primary" disabled={pending} onClick={onApprove} className="w-full">
          {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
          {pending ? "Aprobando acceso…" : "Aprobar acceso"}
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={onReject} className="text-danger border-danger/30 hover:bg-danger/5"><X className="h-5 w-5" aria-hidden="true" />Rechazar</Button>
      </div>
    </Card>
  );
}

function RequestDetail({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return <div><dt className="text-ink-500 flex items-center gap-1 text-xs font-bold">{icon}{label}</dt><dd className="text-pool-deep mt-1 font-semibold">{value}</dd></div>;
}
