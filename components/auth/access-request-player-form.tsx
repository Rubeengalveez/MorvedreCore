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
      <div className="border-ink-300 bg-paper-card rounded-md border p-6 text-center shadow-md">
        <h2 className="font-display text-brand-deep text-xl font-extrabold">Solicitud enviada</h2>
        <p className="text-ink-600 mt-2 text-sm">
          Tu cuenta está pendiente de activación. El administrador del club revisará tus datos y te
          pasará una contraseña provisional para que entres y la cambies.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4" noValidate>
      {state?.error ? (
        <Alert variant="danger" title="No pudimos enviar la solicitud">
          {state.error}
        </Alert>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-ink-700 text-xs font-bold">
          Email
        </label>
        <Input id="email" type="email" value={email} disabled className="bg-ink-100 text-ink-600" />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="fullName" className="text-ink-700 text-xs font-bold">
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
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="birthYear" className="text-ink-700 text-xs font-bold">
            Año de nacimiento
          </label>
          <Input
            id="birthYear"
            name="birthYear"
            type="number"
            placeholder="2010"
            min={1900}
            max={2100}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="gender" className="text-ink-700 text-xs font-bold">
            Género
          </label>
          <Select id="gender" name="gender" required defaultValue="">
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
