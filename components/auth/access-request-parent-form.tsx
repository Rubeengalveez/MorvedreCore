"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PlayerIdentityFields } from "@/components/auth/player-identity-fields";
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
  const [relation, setRelation] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const nextId = useRef(1);
  const formRef = useRef<HTMLFormElement>(null);

  function updateChild(id: number, field: "fullName" | "birthYear", value: string) {
    setChildren((rows) => rows.map((row) => row.id === id ? { ...row, [field]: value } : row));
  }

  function continueToChildren() {
    const fields = formRef.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-parent-step]");
    if (!fields) return;
    for (const field of fields) {
      if (!field.reportValidity()) return;
    }
    setStep(2);
  }

  if (state?.success) return <div role="status" className="bg-pool-foam/60 text-pool-deep rounded-2xl p-5 text-center">
    <p className="text-lg font-extrabold">Solicitud enviada</p>
    <p className="mt-2 text-sm leading-relaxed">
      Revisaremos tu vínculo familiar. Si usaste Google, entra de nuevo tras la aprobación.
      Si usaste correo, te entregaremos una contraseña provisional.
    </p>
  </div>;

  return <form ref={formRef} action={action} className="flex w-full flex-col gap-3.5">
    {state?.error ? <Alert variant="danger" title="No pudimos enviar la solicitud">{state.error}</Alert> : null}
    <p className="bg-pool-foam text-pool-deep rounded-lg px-3 py-2 text-xs font-extrabold tracking-wide uppercase">
      Paso {step} de 2 · {step === 1 ? "Tus datos" : "Tus hijos"}
    </p>
    <input type="hidden" name="role" value="parent" />
    <input type="hidden" name="children" value={JSON.stringify(children.map((child) => ({
      fullName: child.fullName.trim(), birthYear: Number(child.birthYear),
    })))} />
    <div className={step === 1 ? "flex flex-col gap-1.5" : "hidden"}>
      <label htmlFor="parent-request-email" className="text-eyebrow text-ink-700">Correo electrónico</label>
      <Input id="parent-request-email" name="email" type="email" required defaultValue={email} data-parent-step
        readOnly={lockedEmail} autoComplete="email" inputMode="email" spellCheck={false}
        placeholder="Ej. nombre@correo.com"
        className="bg-pool-ice focus:border-pool-blue focus:bg-paper min-h-[52px] rounded-[var(--r-sm)] border-transparent px-4" />
    </div>
    <div className={step === 1 ? "flex flex-col gap-1.5" : "hidden"}>
      <label htmlFor="parent-request-name" className="text-eyebrow text-ink-700">Tu nombre completo</label>
      <Input id="parent-request-name" name="fullName" required minLength={2} maxLength={100} data-parent-step
        autoComplete="name" placeholder="Ej. Laura Martínez"
        className="bg-pool-ice focus:border-pool-blue focus:bg-paper min-h-[52px] rounded-[var(--r-sm)] border-transparent px-4" />
    </div>
    <div className={step === 1 ? "flex flex-col gap-1.5" : "hidden"}>
      <label htmlFor="parent-request-relation" className="text-eyebrow text-ink-700">Relación con los jugadores</label>
      <Select id="parent-request-relation" name="relation" required value={relation} data-parent-step
        onChange={(event) => setRelation(event.target.value)}
        className="bg-pool-ice focus:border-pool-blue focus:bg-paper min-h-[52px] rounded-[var(--r-sm)] border-transparent px-4">
        <option value="" disabled>Selecciona una opción</option>
        <option value="mother">Madre</option><option value="father">Padre</option>
        <option value="other">Otro</option>
      </Select>
    </div>
    {step === 1 ? <Button type="button" size="lg" className="w-full" onClick={continueToChildren}>
      Continuar con tus hijos
    </Button> : null}
    {step === 2 ? <fieldset className="flex flex-col gap-2.5">
      <legend className="text-pool-deep font-extrabold">Tus hijos en el club</legend>
      {children.map((child, index) => <div key={child.id} className="bg-pool-foam/50 flex flex-col gap-2 rounded-xl p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-pool-deep text-sm font-bold">Jugador {index + 1}</span>
          {children.length > 1 ? <button type="button" onClick={() => setChildren((rows) => rows.filter((row) => row.id !== child.id))}
            className="text-danger flex min-h-12 min-w-12 items-center justify-center rounded-xl" aria-label={`Quitar jugador ${index + 1}`}>
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          </button> : null}
        </div>
        <PlayerIdentityFields idPrefix={`child-${child.id}`} fullName={child.fullName}
          birthYear={child.birthYear} forParent
          onNameChange={(value) => updateChild(child.id, "fullName", value)}
          onYearChange={(value) => updateChild(child.id, "birthYear", value)}
          supportMessage={`Hola Rubén, estoy intentando acceder como ${relation === "father" ? "padre" : relation === "mother" ? "madre" : "familiar"} a Morvedre Core y no encuentro a mi hijo en el club.`} />
      </div>)}
      {children.length < 10 ? <Button type="button" variant="outline" onClick={() =>
        setChildren((rows) => [...rows, { id: nextId.current++, fullName: "", birthYear: "" }])}>
        <Plus className="h-5 w-5" aria-hidden="true" /> Añadir otro hijo
      </Button> : null}
    </fieldset> : null}
    {step === 2 ? <div className="flex flex-col gap-2">
      <SubmitButton />
      <Button type="button" variant="ghost" className="w-full" onClick={() => setStep(1)}>Volver a mis datos</Button>
    </div> : null}
  </form>;
}
