"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PlayerIdentityFields } from "@/components/auth/player-identity-fields";
import { authFieldClass } from "@/components/auth/auth-field-style";
import { submitAccessRequest, type SubmitAccessRequestState } from "@/server/actions/auth";

type Child = { id: number; fullName: string; birthYear: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" size="lg" className="w-full" disabled={pending}>
    {pending ? "Enviando…" : "Enviar solicitud"}
  </Button>;
}

export function AccessRequestParentForm() {
  const [state, action] = useActionState<SubmitAccessRequestState, FormData>(submitAccessRequest, null);
  const [children, setChildren] = useState<Child[]>([{ id: 0, fullName: "", birthYear: "" }]);
  const [relation, setRelation] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const nextId = useRef(1);
  const formRef = useRef<HTMLFormElement>(null);
  const stepRef = useRef<HTMLParagraphElement>(null);
  const previousStep = useRef(step);
  const addChildButtonRef = useRef<HTMLButtonElement>(null);
  const pendingChildFocus = useRef<number | "add" | null>(null);

  useEffect(() => {
    if (previousStep.current !== step) {
      stepRef.current?.focus();
      previousStep.current = step;
    }
  }, [step]);

  useEffect(() => {
    const target = pendingChildFocus.current;
    if (target === null) return;
    if (target === "add") addChildButtonRef.current?.focus();
    else formRef.current?.querySelector<HTMLInputElement>(`#child-${target}-name`)?.focus();
    pendingChildFocus.current = null;
  }, [children]);

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
    <h2 className="text-lg font-extrabold">Solicitud enviada</h2>
    <p className="mt-2 text-sm leading-relaxed">
      Revisaremos tu vínculo familiar.{" "}
      {state.accessMethod === "google"
        ? "Tras la aprobación, vuelve a entrar con Google."
        : "Te entregaremos una contraseña provisional que cambiarás al entrar."}
    </p>
  </div>;

  return <form ref={formRef} action={action} className="flex w-full flex-col gap-3.5">
    {state?.error ? <Alert variant="danger" title="No pudimos enviar la solicitud">{state.error}</Alert> : null}
    <div className="flex min-h-12 items-center justify-between gap-2">
      <p ref={stepRef} tabIndex={-1} className="bg-pool-foam text-pool-deep focus-visible:ring-pool-blue rounded-lg px-3 py-2 text-xs font-extrabold tracking-wide uppercase focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none">
        Paso {step} de 2 · {step === 1 ? "Tus datos" : "Tus hijos"}
      </p>
      {step === 2 ? <button type="button" onClick={() => setStep(1)}
        className="text-pool-blue focus-visible:ring-pool-blue inline-flex min-h-12 items-center gap-1.5 rounded-lg px-2 text-sm font-bold hover:bg-pool-foam focus-visible:ring-2 focus-visible:outline-none">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />Editar datos
      </button> : null}
    </div>
    <input type="hidden" name="role" value="parent" />
    <input type="hidden" name="children" value={JSON.stringify(children.map((child) => ({
      fullName: child.fullName.trim(), birthYear: Number(child.birthYear),
    })))} />
    <div className={step === 1 ? "flex flex-col gap-1.5" : "hidden"}>
      <label htmlFor="parent-request-email" className="text-eyebrow text-ink-700">Correo electrónico</label>
      <Input id="parent-request-email" name="email" type="email" required data-parent-step
        autoComplete="off" inputMode="email" spellCheck={false}
        placeholder="Ej. nombre@correo.com"
        className={authFieldClass} />
    </div>
    <div className={step === 1 ? "flex flex-col gap-1.5" : "hidden"}>
      <label htmlFor="parent-request-name" className="text-eyebrow text-ink-700">Tu nombre completo</label>
      <Input id="parent-request-name" name="fullName" required minLength={2} maxLength={100} data-parent-step
        autoComplete="name" placeholder="Ej. Laura Martínez"
        className={authFieldClass} />
    </div>
    <div className={step === 1 ? "flex flex-col gap-1.5" : "hidden"}>
      <label htmlFor="parent-request-relation" className="text-eyebrow text-ink-700">Relación con los jugadores</label>
      <Select id="parent-request-relation" name="relation" required value={relation} data-parent-step
        onChange={(event) => setRelation(event.target.value)}
        className={authFieldClass}>
        <option value="" disabled>Selecciona una opción</option>
        <option value="mother">Madre</option><option value="father">Padre</option>
        <option value="other">Otro</option>
      </Select>
    </div>
    {step === 1 ? <Button type="button" size="lg" className="w-full" onClick={continueToChildren}>
      Continuar con tus hijos
    </Button> : null}
    {step === 2 ? <section aria-labelledby="parent-children-heading" className="flex flex-col gap-3">
      <h2 id="parent-children-heading" className="text-pool-deep mb-1 font-display text-lg font-extrabold">Busca a tus hijos</h2>
      {children.map((child, index) => <div key={child.id} role="group" aria-labelledby={`child-${child.id}-heading`} className="border-pool-blue/75 bg-white shadow-elev-1 flex flex-col gap-3 rounded-2xl border-2 p-3.5">
        <div className="flex min-h-12 items-center gap-2.5">
          <span aria-hidden="true" className="bg-pool-deep flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-extrabold text-white">{index + 1}</span>
          <h3 id={`child-${child.id}-heading`} className="text-pool-deep flex-1 text-base font-extrabold">Hijo {index + 1}</h3>
          {children.length > 1 ? <button type="button" onClick={() => {
            pendingChildFocus.current = "add";
            setChildren((rows) => rows.filter((row) => row.id !== child.id));
          }}
            className="text-red-800 hover:bg-red-50 focus-visible:ring-red-800 inline-flex min-h-12 items-center gap-1 rounded-xl px-2 text-sm font-bold focus-visible:ring-2 focus-visible:outline-none" aria-label={`Quitar hijo ${index + 1}`}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />Quitar
          </button> : null}
        </div>
        <PlayerIdentityFields idPrefix={`child-${child.id}`} fullName={child.fullName}
          birthYear={child.birthYear} forParent
          onNameChange={(value) => updateChild(child.id, "fullName", value)}
          onYearChange={(value) => updateChild(child.id, "birthYear", value)}
          supportMessage={`Hola Rubén, estoy intentando acceder como ${relation === "father" ? "padre" : relation === "mother" ? "madre" : "familiar"} a Morvedre Core y no encuentro a mi hijo en el club.`} />
      </div>)}
      {children.length < 10 ? <button ref={addChildButtonRef} type="button" onClick={() => {
        const id = nextId.current++;
        pendingChildFocus.current = id;
        setChildren((rows) => [...rows, { id, fullName: "", birthYear: "" }]);
      }}
        className="border-pool-blue text-pool-deep hover:bg-pool-foam focus-visible:ring-pool-blue inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 bg-white px-3 py-2.5 text-sm font-extrabold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none">
        <Plus className="h-5 w-5" aria-hidden="true" /> Añadir otro hijo
      </button> : null}
    </section> : null}
    {step === 2 ? <SubmitButton /> : null}
  </form>;
}
