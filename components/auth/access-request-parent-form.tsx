"use client";

import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { MdAutorenew, MdClose } from "react-icons/md";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  submitAccessRequest,
  searchChildrenProfiles,
  type SubmitAccessRequestState,
} from "@/server/actions/auth";

interface ChildOption {
  id: string;
  full_name: string;
  birth_year: number | null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? <MdAutorenew className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
      {pending ? "Enviando..." : "Enviar solicitud"}
    </Button>
  );
}

export interface AccessRequestParentFormProps {
  email: string;
}

export function AccessRequestParentForm({ email }: AccessRequestParentFormProps) {
  const [state, formAction] = useActionState<SubmitAccessRequestState, FormData>(
    submitAccessRequest,
    null,
  );
  const [, startTransition] = useTransition();
  const [fullName, setFullName] = useState("");
  const [relation, setRelation] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ChildOption[]>([]);
  const [selected, setSelected] = useState<ChildOption[]>([]);
  const [searching, setSearching] = useState(false);

  const runSearch = useCallback(async (value: string) => {
    if (value.trim().length < 3) {
      setResults([]);
      return;
    }
    setSearching(true);
    const data = await searchChildrenProfiles(value);
    setResults(data?.children ?? []);
    setSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      runSearch(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const toggleChild = (child: ChildOption) => {
    setSelected((prev) => {
      if (prev.some((c) => c.id === child.id)) {
        return prev.filter((c) => c.id !== child.id);
      }
      return [...prev, child];
    });
    setQuery("");
    setResults([]);
  };

  const removeChild = (id: string) => {
    setSelected((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    fd.set("email", email);
    fd.set("role", "parent");
    fd.set("childrenIds", JSON.stringify(selected.map((c) => c.id)));
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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="relation" className="text-eyebrow text-ink-700">
          Relaci&oacute;n con los hijos
        </label>
        <Select
          id="relation"
          name="relation"
          required
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
          className="bg-pool-ice focus:border-pool-blue focus:bg-paper h-[52px] min-h-[52px] rounded-[var(--r-sm)] border-transparent px-4"
        >
          <option value="" disabled>
            Selecciona...
          </option>
          <option value="mother">Madre</option>
          <option value="father">Padre</option>
          <option value="legal_guardian">Tutor legal</option>
          <option value="other">Otro</option>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="childSearch" className="text-eyebrow text-ink-700">
          Buscar hijos/as
        </label>
        <Input
          id="childSearch"
          type="text"
          placeholder="Escribe el nombre de tu hijo/a"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          className="bg-pool-ice focus:border-pool-blue focus:bg-paper h-[52px] min-h-[52px] rounded-[var(--r-sm)] border-transparent px-4"
        />
        {searching ? (
          <p className="text-ink-600 text-xs">Buscando...</p>
        ) : results.length > 0 ? (
          <ul className="border-ink-200 bg-paper rounded-[var(--r-sm)] border">
            {results.map((child) => (
              <li key={child.id}>
                <button
                  type="button"
                  onClick={() => toggleChild(child)}
                  className="hover:bg-pool-foam w-full px-3 py-2.5 text-left text-sm transition-colors"
                >
                  {child.full_name}
                  {child.birth_year ? ` (${child.birth_year})` : null}
                </button>
              </li>
            ))}
          </ul>
        ) : query.trim().length >= 3 && !searching ? (
          <p className="text-ink-600 text-xs">
            No se encontraron hijos/as activados con ese nombre.
          </p>
        ) : null}
      </div>

      {selected.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-eyebrow text-ink-700">Hijos/as seleccionados</span>
          <div className="flex flex-wrap gap-2">
            {selected.map((child) => (
              <span
                key={child.id}
                className="bg-pool-foam text-pool-deep inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
              >
                {child.full_name}
                <button
                  type="button"
                  onClick={() => removeChild(child.id)}
                  className="hover:bg-pool-blue/20 rounded-full p-0.5"
                  aria-label={`Quitar ${child.full_name}`}
                >
                  <MdClose className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <p className="text-ink-600 text-xs">
        Si tu hijo/a no aparece, es porque a&uacute;n no tiene una cuenta activada en el club. Si
        tiene email propio, solicita primero su cuenta de jugador. Si es menor, cr&eacute;ale una
        cuenta de correo o usa la de uno de los padres.
      </p>

      <SubmitButton />
    </form>
  );
}
