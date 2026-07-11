"use client";

import { useActionState, useState, useTransition } from "react";
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
}

export function AccessRequestPlayerForm({ email }: AccessRequestPlayerFormProps) {
  const [state, formAction] = useActionState<SubmitAccessRequestState, FormData>(
    submitAccessRequest,
    null,
  );
  const [, startTransition] = useTransition();
  const [fullName, setFullName] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    fd.set("email", email);
    fd.set("role", "player");
    startTransition(() => {
      formAction(fd);
    });
  };

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
            Tu cuenta est&aacute; pendiente de activaci&oacute;n. El administrador del club
            revisar&aacute; tus datos y te pasar&aacute; una contrase&ntilde;a provisional para que
            entres y la cambies.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
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
          value={email}
          disabled
          className="bg-ink-100 text-ink-600 h-[52px] min-h-[52px] rounded-[var(--r-sm)] border-transparent px-4"
        />
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
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="bg-pool-ice focus:border-pool-blue focus:bg-paper h-[52px] min-h-[52px] rounded-[var(--r-sm)] border-transparent px-4"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="gender" className="text-eyebrow text-ink-700">
            G&eacute;nero
          </label>
          <Select
            id="gender"
            name="gender"
            required
            defaultValue=""
            className="bg-pool-ice focus:border-pool-blue focus:bg-paper h-[52px] min-h-[52px] rounded-[var(--r-sm)] border-transparent px-4"
          >
            <option value="" disabled>
              Selecciona...
            </option>
            <option value="male">Hombre</option>
            <option value="female">Mujer</option>
            <option value="other">Otro</option>
            <option value="prefer_not_to_say">Prefiero no decirlo</option>
          </Select>
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}
