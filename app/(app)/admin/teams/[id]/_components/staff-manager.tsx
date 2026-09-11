"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Search, X } from "lucide-react";
import { MdAutorenew, MdDelete } from "react-icons/md";
import { useActionState, useEffect, useState, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { assignStaff, unassignStaff } from "@/server/actions/admin";

const ROLE_OPTIONS = [
  { value: "head_coach", label: "Entrenador principal" },
  { value: "assistant_coach", label: "Entrenador asistente" },
  { value: "delegate", label: "Delegado" },
  { value: "physical_trainer", label: "Preparador físico" },
] as const;

const RELATION_OPTIONS: Record<(typeof ROLE_OPTIONS)[number]["value"], string> = {
  head_coach: "Entrenador principal",
  assistant_coach: "Entrenador asistente",
  delegate: "Delegado",
  physical_trainer: "Preparador físico",
};

const staffSchema = z.object({
  profile_id: z.string().min(1, "Selecciona una persona de la lista.").uuid("Persona inválida."),
  role: z.enum(["head_coach", "assistant_coach", "delegate", "physical_trainer"]),
});

type StaffValues = z.infer<typeof staffSchema>;

type ActionState = { ok?: true; error?: string } | null;

async function submitAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const teamId = String(formData.get("team_id") ?? "");
  try {
    await assignStaff({
      team_id: teamId,
      profile_id: String(formData.get("profile_id") ?? ""),
      role: String(formData.get("role") ?? "head_coach") as StaffValues["role"],
    });
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No pudimos asignar." };
  }
}

function SubmitButton({ label, formId }: { label: string; formId?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" form={formId} size="lg" className="w-full" disabled={pending}>
      {pending ? <MdAutorenew className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
      {pending ? "Asignando..." : label}
    </Button>
  );
}

export interface StaffOption {
  id: string;
  full_name: string;
}

export interface StaffAssignSheetProps {
  teamId: string;
  candidates: StaffOption[];
  trigger: React.ReactNode;
}

export function StaffAssignSheet({ teamId, candidates, trigger }: StaffAssignSheetProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(submitAction, null);
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const formId = `staff-form-${teamId}`;

  const form = useForm<StaffValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: { profile_id: "", role: "head_coach" },
  });

  useEffect(() => {
    if (state?.ok) {
      form.reset({ profile_id: "", role: "head_coach" });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state, form]);

  const filtered = candidates
    .filter((c) => c.full_name.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 50);

  const onSubmit = form.handleSubmit((values) => {
    const fd = new FormData();
    fd.append("team_id", teamId);
    fd.append("profile_id", values.profile_id);
    fd.append("role", values.role);
    startTransition(() => {
      formAction(fd);
    });
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent size="lg">
        <SheetHeader>
          <SheetTitle>Asignar personal</SheetTitle>
          <SheetDescription>
            Añade entrenador, asistente o delegado al cuerpo técnico del equipo.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Form {...form}>
            <form
              id={formId}
              onSubmit={onSubmit}
              className="flex flex-col gap-4 pb-2"
              noValidate
            >
              {state?.error ? (
                <p className="text-danger text-sm font-medium">{state.error}</p>
              ) : null}

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      >
                        {ROLE_OPTIONS.map((r) => (
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

              <FormField
                control={form.control}
                name="profile_id"
                render={({ field }) => {
                  const selectedPerson = candidates.find((c) => c.id === field.value);
                  return (
                    <FormItem>
                      <FormLabel>Persona</FormLabel>
                      <FormControl>
                        <div className="flex flex-col gap-2">
                          <input
                            type="hidden"
                            name={field.name}
                            value={field.value}
                            ref={field.ref}
                          />

                          <div className="relative">
                            <Search
                              className="text-ink-400 pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
                              aria-hidden="true"
                            />
                            <Input
                              type="search"
                              placeholder="Buscar por nombre..."
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                              className="h-12 pl-9 pr-9 text-base"
                            />
                            {search ? (
                              <button
                                type="button"
                                onClick={() => setSearch("")}
                                className="text-ink-400 hover:text-ink-700 focus-visible:ring-pool-blue absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1.5 focus-visible:ring-2 focus-visible:outline-none"
                                aria-label="Borrar búsqueda"
                              >
                                <X className="h-4 w-4" aria-hidden="true" />
                              </button>
                            ) : null}
                          </div>

                          <div
                            role="listbox"
                            aria-label="Listado de personas disponibles"
                            className="border-ink-200 bg-paper divide-ink-100 max-h-56 sm:max-h-64 overflow-y-auto rounded-xl border divide-y shadow-xs"
                          >
                            {filtered.length === 0 ? (
                              <div className="p-6 text-center text-sm text-ink-500">
                                {candidates.length === 0
                                  ? "Todas las personas registradas ya están asignadas."
                                  : "No se encontraron personas que coincidan con la búsqueda."}
                              </div>
                            ) : (
                              filtered.map((c) => {
                                const isSelected = field.value === c.id;
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => field.onChange(c.id)}
                                    className={cn(
                                      "flex w-full min-h-12 touch-manipulation items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors focus-visible:ring-pool-blue focus-visible:ring-2 focus-visible:outline-none",
                                      isSelected
                                        ? "bg-pool-foam border-l-4 border-l-pool-blue text-pool-deep"
                                        : "hover:bg-pool-foam/40 text-ink-900",
                                    )}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <span
                                        className={cn(
                                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                                          isSelected
                                            ? "bg-pool-deep text-paper"
                                            : "bg-ink-100 text-ink-700",
                                        )}
                                      >
                                        {c.full_name.slice(0, 2).toUpperCase()}
                                      </span>
                                      <span className="truncate text-sm font-semibold text-pool-deep">
                                        {c.full_name}
                                      </span>
                                    </div>
                                    {isSelected ? (
                                      <span className="bg-pool-blue text-paper flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                      </span>
                                    ) : null}
                                  </button>
                                );
                              })
                            )}
                          </div>

                          {selectedPerson ? (
                            <div className="border-pool-blue/30 bg-pool-foam/60 flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <Check className="text-pool-blue h-4 w-4 shrink-0" aria-hidden="true" />
                                <span className="truncate font-medium text-pool-deep">
                                  Seleccionado:{" "}
                                  <strong className="font-bold">{selectedPerson.full_name}</strong>
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => field.onChange("")}
                                className="text-ink-500 hover:text-ink-900 ml-2 shrink-0 font-bold underline"
                              >
                                Quitar
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </form>
          </Form>
        </SheetBody>
        <SheetFooter>
          <SubmitButton label="Asignar" formId={formId} />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export interface StaffListProps {
  teamId: string;
  staff: Array<{ profile_id: string; role: StaffValues["role"]; full_name: string }>;
}

export function StaffList({ teamId, staff }: StaffListProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleRemove(profileId: string, role: StaffValues["role"], name: string) {
    if (!window.confirm(`¿Quitar a ${name} del equipo?`)) {
      return;
    }
    const key = `${profileId}-${role}`;
    setPendingId(key);
    startTransition(async () => {
      try {
        await unassignStaff({ team_id: teamId, profile_id: profileId, role });
      } finally {
        setPendingId(null);
      }
    });
  }

  if (staff.length === 0) {
    return (
      <p className="text-ink-600 text-sm italic">Aún no has asignado personal a este equipo.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {staff.map((s) => {
        const key = `${s.profile_id}-${s.role}`;
        return (
          <li
            key={key}
            className="border-ink-300 bg-paper flex items-center justify-between gap-3 rounded-md border px-4 py-3"
          >
            <div className="flex flex-col">
              <span className="font-display text-pool-deep text-base font-bold">{s.full_name}</span>
              <span className="text-ink-600 text-xs font-semibold tracking-wider uppercase">
                {RELATION_OPTIONS[s.role]}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:bg-danger/10 h-12 w-12 p-0"
              aria-label={`Quitar ${s.full_name}`}
              disabled={pendingId === key}
              onClick={() => handleRemove(s.profile_id, s.role, s.full_name)}
            >
              {pendingId === key ? (
                <MdAutorenew className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <MdDelete className="h-5 w-5" aria-hidden="true" />
              )}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
