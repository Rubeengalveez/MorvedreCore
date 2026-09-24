"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitAccessRequest, type SubmitAccessRequestState } from "@/server/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" size="lg" className="w-full" disabled={pending}>
    {pending ? "Enviando…" : "Enviar solicitud"}
  </Button>;
}

export function AccessRequestStaffForm({ email, lockedEmail }: { email: string; lockedEmail: boolean }) {
  const [state, action] = useActionState<SubmitAccessRequestState, FormData>(submitAccessRequest, null);
  if (state?.success) {
    return <div role="status" className="bg-pool-foam/60 text-pool-deep rounded-2xl p-5 text-center">
      <p className="text-lg font-extrabold">Solicitud enviada</p>
      <p className="mt-2 text-sm leading-relaxed">
        Revisaremos tu perfil y tus permisos. Si entraste con Google, vuelve a entrar cuando esté aprobado.
        Si usaste correo, el administrador te entregará una contraseña provisional.
      </p>
    </div>;
  }
  return <form action={action} className="flex flex-col gap-4">
    {state?.error ? <Alert variant="danger" title="No pudimos enviar la solicitud">{state.error}</Alert> : null}
    <input type="hidden" name="role" value="staff" />
    <div className="flex flex-col gap-1.5">
      <label htmlFor="staff-request-email" className="text-eyebrow text-ink-700">Correo registrado en el club</label>
      <Input id="staff-request-email" name="email" type="email" required defaultValue={email}
        readOnly={lockedEmail} autoComplete="email"
        className="bg-pool-ice focus:border-pool-blue focus:bg-paper min-h-[52px] rounded-[var(--r-sm)] border-transparent px-4" />
    </div>
    <div className="flex flex-col gap-1.5">
      <label htmlFor="staff-request-name" className="text-eyebrow text-ink-700">Nombre completo</label>
      <Input id="staff-request-name" name="fullName" required minLength={2} maxLength={100}
        autoComplete="name" placeholder="Tu nombre y apellidos"
        className="bg-pool-ice focus:border-pool-blue focus:bg-paper min-h-[52px] rounded-[var(--r-sm)] border-transparent px-4" />
    </div>
    <p className="text-ink-600 text-sm">Tu perfil y tus funciones deben estar dados de alta antes de solicitar acceso.</p>
    <SubmitButton />
  </form>;
}
