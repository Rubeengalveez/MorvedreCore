"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { submitAccessRequest, type SubmitAccessRequestState } from "@/server/actions/auth";

type Child = { id: number; fullName: string; birthYear: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" size="lg" className="w-full" disabled={pending}>
    {pending ? "Enviando…" : "Enviar solicitud"}
  </Button>;
}

export function AccessRequestParentForm({ email, lockedEmail = false }: { email: string; lockedEmail?: boolean }) {
  const [state, action] = useActionState<SubmitAccessRequestState, FormData>(submitAccessRequest, null);
  const [children, setChildren] = useState<Child[]>([{ id: 0, fullName: "", birthYear: "" }]);
  const nextId = useRef(1);

  function updateChild(id: number, field: "fullName" | "birthYear", value: string) {
    setChildren((rows) => rows.map((row) => row.id === id ? { ...row, [field]: value } : row));
  }

  if (state?.success) return <div role="status" className="bg-pool-foam/60 text-pool-deep rounded-2xl p-5 text-center">
    <p className="text-lg font-extrabold">Solicitud enviada</p>
    <p className="mt-2 text-sm leading-relaxed">
      Revisaremos tu vínculo familiar. Si usaste Google, entra de nuevo tras la aprobación.
      Si usaste correo, te entregaremos una contraseña provisional.
    </p>
  </div>;

  return <form action={action} className="flex w-full flex-col gap-4">
    {state?.error ? <Alert variant="danger" title="No pudimos enviar la solicitud">{state.error}</Alert> : null}
    <input type="hidden" name="role" value="parent" />
    <input type="hidden" name="children" value={JSON.stringify(children.map((child) => ({
      fullName: child.fullName.trim(), birthYear: Number(child.birthYear),
    })))} />
    <div className="flex flex-col gap-1.5">
      <label htmlFor="parent-request-email" className="text-eyebrow text-ink-700">Correo</label>
      <Input id="parent-request-email" name="email" type="email" required defaultValue={email}
        readOnly={lockedEmail} autoComplete="email"
        className="bg-pool-ice focus:border-pool-blue focus:bg-paper min-h-[52px] rounded-[var(--r-sm)] border-transparent px-4" />
    </div>
    <div className="flex flex-col gap-1.5">
      <label htmlFor="parent-request-name" className="text-eyebrow text-ink-700">Tu nombre completo</label>
      <Input id="parent-request-name" name="fullName" required minLength={2} maxLength={100}
        autoComplete="name" placeholder="Nombre y apellidos"
        className="bg-pool-ice focus:border-pool-blue focus:bg-paper min-h-[52px] rounded-[var(--r-sm)] border-transparent px-4" />
    </div>
    <div className="flex flex-col gap-1.5">
      <label htmlFor="parent-request-relation" className="text-eyebrow text-ink-700">Relación con los jugadores</label>
      <Select id="parent-request-relation" name="relation" required defaultValue=""
        className="bg-pool-ice focus:border-pool-blue focus:bg-paper min-h-[52px] rounded-[var(--r-sm)] border-transparent px-4">
        <option value="" disabled>Selecciona una opción</option>
        <option value="mother">Madre</option><option value="father">Padre</option>
        <option value="legal_guardian">Tutor/a legal</option><option value="other">Otro vínculo</option>
      </Select>
    </div>
    <fieldset className="flex flex-col gap-3">
      <legend className="text-pool-deep font-extrabold">Tus hijos en el club</legend>
      <p className="text-ink-600 text-sm">Escríbelos tal como figuran en la plantilla. No necesitan tener cuenta propia.</p>
      {children.map((child, index) => <div key={child.id} className="bg-pool-foam/45 flex flex-col gap-2 rounded-xl p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-pool-deep text-sm font-bold">Jugador {index + 1}</span>
          {children.length > 1 ? <button type="button" onClick={() => setChildren((rows) => rows.filter((row) => row.id !== child.id))}
            className="text-danger flex min-h-12 min-w-12 items-center justify-center rounded-xl" aria-label={`Quitar jugador ${index + 1}`}>
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          </button> : null}
        </div>
        <label htmlFor={`child-name-${child.id}`} className="text-ink-700 text-sm font-semibold">Nombre completo</label>
        <Input id={`child-name-${child.id}`} value={child.fullName} required minLength={5} maxLength={100}
          onChange={(event) => updateChild(child.id, "fullName", event.target.value)} placeholder="Nombre y apellidos" autoComplete="off" />
        <label htmlFor={`child-year-${child.id}`} className="text-ink-700 text-sm font-semibold">Año de nacimiento</label>
        <Input id={`child-year-${child.id}`} type="number" inputMode="numeric" min={1900}
          max={new Date().getFullYear()} required value={child.birthYear}
          onChange={(event) => updateChild(child.id, "birthYear", event.target.value)} placeholder="2012" />
      </div>)}
      {children.length < 10 ? <Button type="button" variant="outline" onClick={() =>
        setChildren((rows) => [...rows, { id: nextId.current++, fullName: "", birthYear: "" }])}>
        <Plus className="h-5 w-5" aria-hidden="true" /> Añadir otro hijo
      </Button> : null}
    </fieldset>
    <SubmitButton />
  </form>;
}
