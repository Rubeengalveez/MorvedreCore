"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Search, Trash2 } from "lucide-react";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { linkParentChild, unlinkParentChild } from "@/server/actions/admin";

const RELATION_OPTIONS = [
  { value: "mother", label: "Madre" },
  { value: "father", label: "Padre" },
  { value: "legal_guardian", label: "Tutor legal" },
  { value: "other", label: "Otro" },
] as const;

const familySchema = z.object({
  parent_profile_id: z.string().uuid("Tutor inválido."),
  child_profile_id: z.string().uuid("Hijo inválido."),
  relation: z.enum(["mother", "father", "legal_guardian", "other"]),
});

type FamilyValues = z.infer<typeof familySchema>;

type ActionState = { ok?: true; error?: string } | null;

async function submitAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await linkParentChild({
      parent_profile_id: String(formData.get("parent_profile_id") ?? ""),
      child_profile_id: String(formData.get("child_profile_id") ?? ""),
      relation: String(formData.get("relation") ?? "legal_guardian") as
        "mother" | "father" | "legal_guardian" | "other",
    });
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No pudimos crear el vínculo." };
  }
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
      {pending ? "Guardando..." : label}
    </Button>
  );
}

export interface PersonOption {
  id: string;
  full_name: string;
  email_contact: string | null;
  birth_year: number | null;
}

export interface FamilyFormSheetProps {
  parents: PersonOption[];
  childrenList: PersonOption[];
  trigger: React.ReactNode;
}

export function FamilyFormSheet({ parents, childrenList, trigger }: FamilyFormSheetProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(submitAction, null);
  const [, startTransition] = useTransition();
  const [parentSearch, setParentSearch] = useState("");
  const [childSearch, setChildSearch] = useState("");

  const form = useForm<FamilyValues>({
    resolver: zodResolver(familySchema),
    defaultValues: {
      parent_profile_id: "",
      child_profile_id: "",
      relation: "legal_guardian",
    },
  });

  useEffect(() => {
    if (state?.ok) {
      form.reset();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      setParentSearch("");
      setChildSearch("");
    }
  }, [state, form]);

  const filteredParents = parents
    .filter(
      (p) =>
        p.full_name.toLowerCase().includes(parentSearch.toLowerCase()) ||
        p.email_contact?.toLowerCase().includes(parentSearch.toLowerCase()),
    )
    .slice(0, 50);

  const filteredChildren = childrenList
    .filter((c) => c.full_name.toLowerCase().includes(childSearch.toLowerCase()))
    .slice(0, 50);

  const onSubmit = form.handleSubmit((values) => {
    const fd = new FormData();
    fd.append("parent_profile_id", values.parent_profile_id);
    fd.append("child_profile_id", values.child_profile_id);
    fd.append("relation", values.relation);
    startTransition(() => {
      formAction(fd);
    });
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent size="lg">
        <SheetHeader>
          <SheetTitle>Nuevo vínculo familiar</SheetTitle>
          <SheetDescription>
            Selecciona la persona tutora, la persona a cargo y la relación.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Form {...form}>
            <form
              id="family-form-new"
              onSubmit={onSubmit}
              className="flex flex-col gap-5 pb-2"
              noValidate
            >
              {state?.error ? (
                <p className="text-danger text-sm font-medium">{state.error}</p>
              ) : null}

              <FormField
                control={form.control}
                name="parent_profile_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tutor</FormLabel>
                    <FormControl>
                      <div className="flex flex-col gap-2">
                        <Input
                          type="search"
                          placeholder="Buscar por nombre o email"
                          value={parentSearch}
                          onChange={(e) => setParentSearch(e.target.value)}
                        />
                        <Select
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        >
                          <option value="">Selecciona un tutor</option>
                          {filteredParents.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.full_name}
                              {p.email_contact ? ` · ${p.email_contact}` : ""}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="child_profile_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hijo / jugador</FormLabel>
                    <FormControl>
                      <div className="flex flex-col gap-2">
                        <Input
                          type="search"
                          placeholder="Buscar por nombre"
                          value={childSearch}
                          onChange={(e) => setChildSearch(e.target.value)}
                        />
                        <Select
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        >
                          <option value="">Selecciona un jugador</option>
                          {filteredChildren.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.full_name}
                              {c.birth_year ? ` (${c.birth_year})` : ""}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="relation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relación</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      >
                        {RELATION_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </SheetBody>
        <SheetFooter>
          <SubmitButton label="Crear vínculo" />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

const RELATION_LABEL: Record<FamilyValues["relation"], string> = {
  mother: "Madre",
  father: "Padre",
  legal_guardian: "Tutor legal",
  other: "Otro",
};

export interface FamilyRow {
  parent_id: string;
  parent_name: string;
  child_id: string;
  child_name: string;
  relation: FamilyValues["relation"];
}

export interface FamiliesTableProps {
  rows: FamilyRow[];
}

export function FamiliesTable({ rows }: FamiliesTableProps) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(
      (r) => r.parent_name.toLowerCase().includes(q) || r.child_name.toLowerCase().includes(q),
    );
  }, [rows, search]);

  function handleRemove(row: FamilyRow) {
    if (!window.confirm(`¿Eliminar el vínculo entre ${row.parent_name} y ${row.child_name}?`)) {
      return;
    }
    const key = `${row.parent_id}-${row.child_id}`;
    setPendingKey(key);
    startTransition(async () => {
      try {
        await unlinkParentChild({
          parent_profile_id: row.parent_id,
          child_profile_id: row.child_id,
        });
      } finally {
        setPendingKey(null);
      }
    });
  }

  if (rows.length === 0) {
    return (
      <div className="border-ink-300 bg-paper rounded-md border border-dashed p-6 text-center">
        <p className="text-pool-deep text-base font-semibold">Sin vínculos familiares.</p>
        <p className="text-ink-600 mt-1 text-sm">
          Cuando los padres y jugadores se unan, aparecerán aquí.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          className="text-ink-600 pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Buscar por nombre de tutor o jugador"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      {filtered.length === 0 ? (
        <div className="border-ink-300 bg-paper rounded-md border border-dashed p-6 text-center">
          <p className="text-ink-600 text-sm">No hay coincidencias.</p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2 sm:hidden">
            {filtered.map((r) => {
              const key = `${r.parent_id}-${r.child_id}`;
              const isPending = pendingKey === key;
              return (
                <li
                  key={key}
                  className="border-ink-300 bg-paper-card shadow-elev-1 flex items-center gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-pool-deep truncate text-sm font-bold">
                      {r.parent_name}
                    </p>
                    <p className="text-ink-600 text-xs">
                      {RELATION_LABEL[r.relation]} de {r.child_name}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger/10 touch-target h-11 w-11 shrink-0 p-0"
                    aria-label={`Eliminar vínculo entre ${r.parent_name} y ${r.child_name}`}
                    disabled={isPending}
                    onClick={() => handleRemove(r)}
                  >
                    {isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-5 w-5" aria-hidden="true" />
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>

          <div className="hidden sm:block">
            <table className="w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr className="text-ink-600 text-xs tracking-wider uppercase">
                  <th className="border-ink-300 border-b px-3 py-2 font-semibold">Tutor</th>
                  <th className="border-ink-300 border-b px-3 py-2 font-semibold">Jugador</th>
                  <th className="border-ink-300 border-b px-3 py-2 font-semibold">Relación</th>
                  <th className="border-ink-300 border-b px-3 py-2 text-right font-semibold">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const key = `${r.parent_id}-${r.child_id}`;
                  const isPending = pendingKey === key;
                  return (
                    <tr key={key} className="text-base">
                      <td className="border-ink-300 font-display text-pool-deep border-b px-3 py-3 font-bold">
                        {r.parent_name}
                      </td>
                      <td className="border-ink-300 text-ink-900 border-b px-3 py-3">
                        {r.child_name}
                      </td>
                      <td className="border-ink-300 text-ink-600 border-b px-3 py-3 text-sm">
                        {RELATION_LABEL[r.relation]}
                      </td>
                      <td className="border-ink-300 border-b px-3 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:bg-danger/10 h-12 w-12 p-0"
                          aria-label={`Eliminar vínculo entre ${r.parent_name} y ${r.child_name}`}
                          disabled={isPending}
                          onClick={() => handleRemove(r)}
                        >
                          {isPending ? (
                            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                          ) : (
                            <Trash2 className="h-5 w-5" aria-hidden="true" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
