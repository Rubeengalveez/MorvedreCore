"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Trash2 } from "lucide-react";
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
import { assignStaff, unassignStaff } from "@/server/actions/admin";

const ROLE_OPTIONS = [
  { value: "head_coach", label: "Entrenador principal" },
  { value: "assistant_coach", label: "Entrenador asistente" },
  { value: "delegate", label: "Delegado" },
  { value: "physical_trainer", label: "Preparador físico" },
] as const;

const staffSchema = z.object({
  team_id: z.string().uuid("Equipo inválido."),
  profile_id: z.string().uuid("Persona inválida."),
  role: z.enum(["head_coach", "assistant_coach", "delegate", "physical_trainer"]),
});

type StaffValues = z.infer<typeof staffSchema>;

type ActionState = { ok?: true; error?: string } | null;

async function submitAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assignStaff({
      team_id: String(formData.get("team_id") ?? ""),
      profile_id: String(formData.get("profile_id") ?? ""),
      role: String(formData.get("role") ?? "head_coach") as StaffValues["role"],
    });
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No pudimos asignar." };
  }
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
      {pending ? "Asignando..." : label}
    </Button>
  );
}

export interface TeamOption {
  id: string;
  label: string;
  season_label: string;
}

export interface PersonOption {
  id: string;
  full_name: string;
}

export interface StaffFormSheetProps {
  teams: TeamOption[];
  people: PersonOption[];
  trigger: React.ReactNode;
}

export function StaffFormSheet({ teams, people, trigger }: StaffFormSheetProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(submitAction, null);
  const [, startTransition] = useTransition();
  const [personSearch, setPersonSearch] = useState("");

  const form = useForm<StaffValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: { team_id: teams[0]?.id ?? "", profile_id: "", role: "head_coach" },
  });

  useEffect(() => {
    if (state?.ok) {
      form.reset({
        team_id: teams[0]?.id ?? "",
        profile_id: "",
        role: "head_coach",
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPersonSearch("");
      setOpen(false);
    }
  }, [state, form, teams]);

  const filteredPeople = people
    .filter((p) => p.full_name.toLowerCase().includes(personSearch.toLowerCase()))
    .slice(0, 50);

  const onSubmit = form.handleSubmit((values) => {
    const fd = new FormData();
    fd.append("team_id", values.team_id);
    fd.append("profile_id", values.profile_id);
    fd.append("role", values.role);
    startTransition(() => {
      formAction(fd);
    });
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent size="lg">
        <SheetHeader>
          <SheetTitle>Nueva asignación</SheetTitle>
          <SheetDescription>Asigna un rol de personal a una persona en un equipo.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Form {...form}>
            <form
              id="staff-form-new"
              onSubmit={onSubmit}
              className="flex flex-col gap-5 pb-2"
              noValidate
            >
              {state?.error ? (
                <p className="text-danger text-sm font-medium">{state.error}</p>
              ) : null}

              <FormField
                control={form.control}
                name="team_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipo</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      >
                        {teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label} · {t.season_label}
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
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Persona</FormLabel>
                    <FormControl>
                      <div className="flex flex-col gap-2">
                        <Input
                          type="search"
                          placeholder="Buscar por nombre"
                          value={personSearch}
                          onChange={(e) => setPersonSearch(e.target.value)}
                        />
                        <Select
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        >
                          <option value="">Selecciona una persona</option>
                          {filteredPeople.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.full_name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </SheetBody>
        <SheetFooter>
          <SubmitButton label="Asignar" />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

const ROLE_LABEL: Record<StaffValues["role"], string> = {
  head_coach: "Entrenador principal",
  assistant_coach: "Entrenador asistente",
  delegate: "Delegado",
  physical_trainer: "Preparador físico",
};

export interface StaffRow {
  team_id: string;
  team_label: string;
  season_label: string;
  profile_id: string;
  profile_name: string;
  role: StaffValues["role"];
}

export interface StaffTableProps {
  rows: StaffRow[];
  teamFilter: string;
  onTeamFilterChange: (id: string) => void;
  teams: Array<{ id: string; label: string; season_label: string }>;
}

export function StaffTable({ rows, teamFilter, onTeamFilterChange, teams }: StaffTableProps) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleRemove(row: StaffRow) {
    const key = `${row.team_id}-${row.profile_id}-${row.role}`;
    setPendingKey(key);
    startTransition(async () => {
      try {
        await unassignStaff({
          team_id: row.team_id,
          profile_id: row.profile_id,
          role: row.role,
        });
      } finally {
        setPendingKey(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <label htmlFor="staff-team-filter" className="text-ink-600 text-sm font-semibold">
          Filtrar por equipo
        </label>
        <Select
          id="staff-team-filter"
          value={teamFilter}
          onChange={(e) => onTeamFilterChange(e.target.value)}
        >
          <option value="">Todos los equipos</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label} · {t.season_label}
            </option>
          ))}
        </Select>
      </div>

      {rows.length === 0 ? (
        <div className="border-ink-300 bg-paper rounded-md border border-dashed p-6 text-center">
          <p className="text-pool-deep text-base font-semibold">Sin cuerpo técnico.</p>
          <p className="text-ink-600 mt-1 text-sm">
            Asigna al menos un entrenador para activar el equipo.
          </p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2 sm:hidden">
            {rows.map((r) => {
              const key = `${r.team_id}-${r.profile_id}-${r.role}`;
              const isPending = pendingKey === key;
              return (
                <li
                  key={key}
                  className="border-ink-300 bg-paper-card shadow-elev-1 flex items-center gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-pool-deep truncate text-sm font-bold">
                      {r.profile_name}
                    </p>
                    <p className="text-ink-600 text-xs">{ROLE_LABEL[r.role]}</p>
                    <p className="text-ink-600 truncate text-xs">
                      {r.team_label} · {r.season_label}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:bg-danger/10 touch-target h-11 w-11 shrink-0 p-0"
                    aria-label={`Quitar a ${r.profile_name}`}
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
                  <th className="border-ink-300 border-b px-3 py-2 font-semibold">Persona</th>
                  <th className="border-ink-300 border-b px-3 py-2 font-semibold">Equipo</th>
                  <th className="border-ink-300 border-b px-3 py-2 font-semibold">Rol</th>
                  <th className="border-ink-300 border-b px-3 py-2 text-right font-semibold">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const key = `${r.team_id}-${r.profile_id}-${r.role}`;
                  const isPending = pendingKey === key;
                  return (
                    <tr key={key} className="text-base">
                      <td className="border-ink-300 font-display text-pool-deep border-b px-3 py-3 font-bold">
                        {r.profile_name}
                      </td>
                      <td className="border-ink-300 border-b px-3 py-3">
                        <div className="flex flex-col">
                          <span className="text-ink-900">{r.team_label}</span>
                          <span className="text-ink-600 text-xs">{r.season_label}</span>
                        </div>
                      </td>
                      <td className="border-ink-300 text-ink-600 border-b px-3 py-3 text-sm">
                        {ROLE_LABEL[r.role]}
                      </td>
                      <td className="border-ink-300 border-b px-3 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger hover:bg-danger/10 h-12 w-12 p-0"
                          aria-label={`Quitar a ${r.profile_name}`}
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
