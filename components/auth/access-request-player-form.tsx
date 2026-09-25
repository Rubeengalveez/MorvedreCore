"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { MdAutorenew } from "react-icons/md";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authFieldClass } from "@/components/auth/auth-field-style";
import { PlayerIdentityFields } from "@/components/auth/player-identity-fields";
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

export function AccessRequestPlayerForm() {
  const [state, formAction] = useActionState<SubmitAccessRequestState, FormData>(
    submitAccessRequest,
    null,
  );
  const [fullName, setFullName] = useState("");
  const [birthYear, setBirthYear] = useState("");

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
          <h2 className="font-display text-pool-deep text-xl font-extrabold">Solicitud enviada</h2>
          <p className="text-ink-600 mt-1 text-sm">
            Revisaremos que tus datos coincidan con el perfil del club.{" "}
            {state.accessMethod === "google"
              ? "Tras la aprobación, vuelve a entrar con Google."
              : "Te entregaremos una contraseña provisional que cambiarás al entrar."}
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
          Correo electrónico
        </label>
        <Input
          id="email"
          type="email"
          name="email"
          placeholder="Ej. nombre@correo.com"
          inputMode="email"
          spellCheck={false}
          required
          autoComplete="off"
          className={`${authFieldClass} h-[52px]`}
        />
      </div>

      <PlayerIdentityFields idPrefix="request-player" fullName={fullName} birthYear={birthYear}
        onNameChange={setFullName} onYearChange={setBirthYear} forParent={false}
        supportMessage="Hola Rubén, estoy intentando solicitar acceso como jugador en Morvedre Core y no aparece mi perfil." />

      <SubmitButton />
    </form>
  );
}
