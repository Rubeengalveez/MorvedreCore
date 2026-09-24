"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { MdAutorenew } from "react-icons/md";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { submitAccessRequest, type SubmitAccessRequestState } from "@/server/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? <MdAutorenew className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
      {pending ? "Enviando..." : "Enviar solicitud"}
    </Button>
  );
}

export interface AccessRequestPlayerFormProps {
  email: string;
  lockedEmail?: boolean;
  teams: Array<{ id: string; label: string }>;
}

export function AccessRequestPlayerForm({ email, lockedEmail = false, teams }: AccessRequestPlayerFormProps) {
  const [state, formAction] = useActionState<SubmitAccessRequestState, FormData>(
    submitAccessRequest,
    null,
  );

  if (state?.success) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="bg-pool-teal/15 text-pool-deep flex h-14 w-14 items-center justify-center rounded-full">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <div>
          <h3 className="font-display text-pool-deep text-xl font-extrabold">Solicitud enviada</h3>
          <p className="text-ink-600 mt-1 text-sm">
            Revisaremos que tus datos coincidan con el perfil del club. Si usaste Google,
            entra de nuevo con Google tras la aprobación. Si solicitaste acceso con correo,
            recibirás una contraseña provisional que cambiarás al entrar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <input type="hidden" name="role" value="player" />
      {state?.error ? (
        <Alert variant="danger" title="No pudimos enviar la solicitud">
          {state.error}
        </Alert>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-eyebrow text-ink-700">
          Email
        </label>
        <Input
          id="email"
          type="email"
          name="email"
          defaultValue={email}
          readOnly={lockedEmail}
          required
          autoComplete="email"
          className="bg-ink-100 text-ink-600 h-[52px] min-h-[52px] rounded-[var(--r-sm)] border-transparent px-4"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="teamId" className="text-eyebrow text-ink-700">Equipo principal</label>
        <Select id="teamId" name="teamId" required defaultValue=""
          className="bg-pool-ice focus:border-pool-blue focus:bg-paper min-h-[52px] rounded-[var(--r-sm)] border-transparent px-4">
          <option value="" disabled>Selecciona tu equipo</option>
          {teams.map((team) => <option key={team.id} value={team.id}>{team.label}</option>)}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="fullName" className="text-eyebrow text-ink-700">
          Nombre completo
        </label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          placeholder="Tu nombre y apellidos"
          required
          minLength={2}
          className="bg-pool-ice focus:border-pool-blue focus:bg-paper h-[52px] min-h-[52px] rounded-[var(--r-sm)] border-transparent px-4"
        />
      </div>

      <div className="flex flex-col gap-1.5">
          <label htmlFor="birthYear" className="text-eyebrow text-ink-700">
            A&ntilde;o de nacimiento
          </label>
          <Input
            id="birthYear"
            name="birthYear"
            type="number"
            placeholder="2010"
            min={1900}
            max={2100}
            required
            className="bg-pool-ice focus:border-pool-blue focus:bg-paper h-[52px] min-h-[52px] rounded-[var(--r-sm)] border-transparent px-4"
          />
      </div>

      <SubmitButton />
    </form>
  );
}
