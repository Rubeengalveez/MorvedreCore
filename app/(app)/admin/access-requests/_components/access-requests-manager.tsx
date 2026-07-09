"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MdAutorenew, MdCheck, MdClose, MdLock } from "react-icons/md";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  approveAccessRequest,
  approveAccessRequestsBulk,
  rejectAccessRequest,
  updateTempPassword,
  type AccessRequestActionState,
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
  player: "Jugador",
  parent: "Padre/Madre",
  coach: "Entrenador",
  delegate: "Delegado",
  directiva: "Directiva",
  admin: "Admin",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AccessRequestsManager({
  initialRequests,
  initialTempPassword,
}: {
  initialRequests: AccessRequest[];
  initialTempPassword: string;
}) {
  const router = useRouter();
  const [requests, setRequests] = useState<AccessRequest[]>(initialRequests);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [tempPasswordState, tempPasswordAction] = useActionState<
    AccessRequestActionState,
    FormData
  >(updateTempPassword, null);

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const otherRequests = requests.filter((r) => r.status !== "pending");

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApprove = (id: string) => {
    setPendingId(id);
    const fd = new FormData();
    fd.append("requestId", id);
    startTransition(async () => {
      const result = await approveAccessRequest(fd);
      setPendingId(null);
      if (result?.success) {
        router.refresh();
        setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r)));
      }
    });
  };

  const handleReject = (id: string) => {
    setPendingId(id);
    const fd = new FormData();
    fd.append("requestId", id);
    startTransition(async () => {
      const result = await rejectAccessRequest(fd);
      setPendingId(null);
      if (result?.success) {
        router.refresh();
        setRequests((prev) => prev.filter((r) => r.id !== id));
      }
    });
  };

  const handleBulkApprove = () => {
    if (selected.size === 0) return;
    const fd = new FormData();
    fd.append("requestIds", JSON.stringify(Array.from(selected)));
    startTransition(async () => {
      const result = await approveAccessRequestsBulk(fd);
      if (result?.success) {
        router.refresh();
        setRequests((prev) =>
          prev.map((r) => (selected.has(r.id) ? { ...r, status: "approved" } : r)),
        );
        setSelected(new Set());
      }
    });
  };

  const handleTempPasswordSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    tempPasswordAction(fd);
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="border-ink-300 bg-paper-card rounded-md border p-4 shadow-sm">
        <div className="text-brand-deep flex items-center gap-2">
          <MdLock className="h-5 w-5" />
          <h2 className="font-display text-lg font-extrabold">Contraseña temporal</h2>
        </div>
        <p className="text-ink-600 mt-1 text-sm">
          Esta es la contraseña que le pasarás manualmente a cada usuario tras aprobarle.
        </p>
        <form onSubmit={handleTempPasswordSubmit} className="mt-3 flex max-w-md gap-2">
          <Input
            name="tempPassword"
            type="text"
            defaultValue={initialTempPassword}
            required
            minLength={1}
            className="flex-1"
          />
          <Button type="submit" variant="secondary">
            Guardar
          </Button>
        </form>
        {tempPasswordState?.success ? (
          <p className="mt-2 text-xs font-semibold text-green-700">Contraseña actualizada.</p>
        ) : tempPasswordState?.error ? (
          <p className="mt-2 text-xs font-semibold text-red-700">{tempPasswordState.error}</p>
        ) : null}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-brand-deep text-lg font-extrabold">
            Solicitudes pendientes ({pendingRequests.length})
          </h2>
          {selected.size > 0 ? (
            <Button onClick={handleBulkApprove} variant="secondary" size="sm">
              Aprobar {selected.size} seleccionadas
            </Button>
          ) : null}
        </div>

        {pendingRequests.length === 0 ? (
          <p className="border-ink-300 bg-paper text-ink-600 rounded-md border p-4 text-sm">
            No hay solicitudes pendientes.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="border-ink-300 bg-paper rounded-md border p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(request.id)}
                      onChange={() => toggleSelected(request.id)}
                      className="accent-pool-deep h-5 w-5"
                    />
                    <div>
                      <p className="font-display text-ink-900 font-extrabold">
                        {request.full_name}
                      </p>
                      <p className="text-ink-600 text-sm">{request.email}</p>
                      <p className="text-ink-500 text-xs">
                        {ROLE_LABELS[request.role] ?? request.role} ·{" "}
                        {formatDate(request.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleApprove(request.id)}
                      disabled={pendingId === request.id}
                      size="sm"
                    >
                      {pendingId === request.id ? (
                        <MdAutorenew className="h-4 w-4 animate-spin" />
                      ) : (
                        <MdCheck className="h-4 w-4" />
                      )}
                      <span className="sr-only">Aprobar</span>
                    </Button>
                    <Button
                      onClick={() => handleReject(request.id)}
                      disabled={pendingId === request.id}
                      variant="danger"
                      size="sm"
                    >
                      <MdClose className="h-4 w-4" />
                      <span className="sr-only">Rechazar</span>
                    </Button>
                  </div>
                </div>

                <div className="text-ink-700 mt-3 grid gap-1 text-sm">
                  {request.birth_year ? <p>Año de nacimiento: {request.birth_year}</p> : null}
                  {request.gender ? <p>Género: {request.gender}</p> : null}
                  {request.relation ? <p>Relación: {request.relation}</p> : null}
                  {request.candidate ? (
                    <p className="text-pool-blue">
                      Perfil candidato: {request.candidate.full_name}
                    </p>
                  ) : null}
                  {request.children && request.children.length > 0 ? (
                    <p>
                      Hijos/as:{" "}
                      {request.children
                        .map((c) => c.child?.full_name ?? c.child_profile_id)
                        .join(", ")}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {otherRequests.length > 0 ? (
        <section>
          <h2 className="font-display text-brand-deep mb-3 text-lg font-extrabold">Historial</h2>
          <div className="flex flex-col gap-3">
            {otherRequests.map((request) => (
              <div
                key={request.id}
                className="border-ink-300 bg-paper rounded-md border p-4 opacity-80 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display text-ink-900 font-extrabold">{request.full_name}</p>
                    <p className="text-ink-600 text-sm">{request.email}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      request.status === "activated"
                        ? "bg-green-100 text-green-800"
                        : "bg-ball-gold/20 text-amber-800"
                    }`}
                  >
                    {request.status === "activated" ? "Activada" : "Aprobada"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
