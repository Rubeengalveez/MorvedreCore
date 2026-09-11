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
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils/cn";
import { rosterPlayer, unrosterPlayer } from "@/server/actions/admin";

const dorsalPattern = /^\d{1,2}$/;

const rosterSchema = z.object({
  player_id: z.string().min(1, "Selecciona un jugador de la lista.").uuid("Jugador inválido."),
  squad_number: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || (dorsalPattern.test(v) && Number(v) >= 0 && Number(v) <= 99),
      "Dorsal entre 0 y 99.",
    ),
});

type RosterValues = z.infer<typeof rosterSchema>;

type ActionState = { ok?: true; error?: string } | null;

async function submitAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const teamId = String(formData.get("team_id") ?? "");
  const squad = formData.get("squad_number");
  const squadNumber = squad && String(squad).trim() !== "" ? Number(squad) : undefined;
  try {
    await rosterPlayer({
      team_id: teamId,
      player_id: String(formData.get("player_id") ?? ""),
      squad_number: squadNumber,
    });
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No pudimos añadir al jugador." };
  }
}

function SubmitButton({ label, formId }: { label: string; formId?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" form={formId} size="lg" className="w-full" disabled={pending}>
      {pending ? <MdAutorenew className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
      {pending ? "Añadiendo..." : label}
    </Button>
  );
}

export interface PlayerOption {
  id: string;
  full_name: string;
  birth_year: number | null;
}

export interface RosterAddSheetProps {
  teamId: string;
  candidates: PlayerOption[];
  trigger: React.ReactNode;
}

export function RosterAddSheet({ teamId, candidates, trigger }: RosterAddSheetProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(submitAction, null);
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const formId = `roster-form-${teamId}`;

  const form = useForm<RosterValues>({
    resolver: zodResolver(rosterSchema),
    defaultValues: { player_id: "", squad_number: "" },
  });

  useEffect(() => {
    if (state?.ok) {
      form.reset({ player_id: "", squad_number: "" });
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
    fd.append("player_id", values.player_id);
    if (values.squad_number !== "" && values.squad_number != null) {
      fd.append("squad_number", String(values.squad_number));
    }
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
          <SheetTitle>Añadir jugador</SheetTitle>
          <SheetDescription>
            Busca por nombre y asigna dorsal. La categoría la valida el servidor.
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
                name="player_id"
                render={({ field }) => {
                  const selectedPlayer = candidates.find((c) => c.id === field.value);
                  return (
                    <FormItem>
                      <FormLabel>Jugador</FormLabel>
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
                            aria-label="Listado de jugadores disponibles"
                            className="border-ink-200 bg-paper divide-ink-100 max-h-56 sm:max-h-64 overflow-y-auto rounded-xl border divide-y shadow-xs"
                          >
                            {filtered.length === 0 ? (
                              <div className="p-6 text-center text-sm text-ink-500">
                                {candidates.length === 0
                                  ? "Todos los jugadores registrados ya forman parte de este equipo."
                                  : "No se encontraron jugadores que coincidan con la búsqueda."}
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
                                      <div className="min-w-0">
                                        <span className="block truncate text-sm font-semibold text-pool-deep">
                                          {c.full_name}
                                        </span>
                                        <span className="text-ink-500 text-xs">
                                          {c.birth_year
                                            ? `Nacimiento: ${c.birth_year}`
                                            : "Sin año registrado"}
                                        </span>
                                      </div>
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

                          {selectedPlayer ? (
                            <div className="border-pool-blue/30 bg-pool-foam/60 flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <Check className="text-pool-blue h-4 w-4 shrink-0" aria-hidden="true" />
                                <span className="truncate font-medium text-pool-deep">
                                  Seleccionado:{" "}
                                  <strong className="font-bold">{selectedPlayer.full_name}</strong>
                                  {selectedPlayer.birth_year
                                    ? ` (${selectedPlayer.birth_year})`
                                    : ""}
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

              <FormField
                control={form.control}
                name="squad_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dorsal (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={99}
                        placeholder="7"
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </SheetBody>
        <SheetFooter>
          <SubmitButton label="Añadir a la plantilla" formId={formId} />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export interface RosterRow {
  player_id: string;
  full_name: string;
  birth_year: number | null;
  squad_number: number | null;
  categoryLabel: string;
}

export interface RosterListProps {
  teamId: string;
  rows: RosterRow[];
}

export function RosterList({ teamId, rows }: RosterListProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleRemove(playerId: string, name: string) {
    if (!window.confirm(`¿Quitar a ${name} de este equipo?`)) {
      return;
    }
    setPendingId(playerId);
    startTransition(async () => {
      try {
        await unrosterPlayer({ team_id: teamId, player_id: playerId });
      } finally {
        setPendingId(null);
      }
    });
  }

  if (rows.length === 0) {
    return (
      <p className="text-ink-600 text-sm italic">
        La plantilla está vacía. Añade el primer jugador con el botón de arriba.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li
          key={r.player_id}
          className="border-ink-300 bg-paper flex items-center gap-3 rounded-md border px-4 py-3"
        >
          <span className="bg-pool-foam text-pool-deep flex h-10 w-10 shrink-0 items-center justify-center rounded font-mono text-base font-bold">
            {r.squad_number ?? "—"}
          </span>
          <div className="flex flex-1 flex-col">
            <span className="font-display text-pool-deep text-base font-bold">{r.full_name}</span>
            <span className="text-ink-600 text-xs">
              {r.birth_year ?? "?"} · {r.categoryLabel}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:bg-danger/10 h-12 w-12 p-0"
            aria-label={`Quitar a ${r.full_name}`}
            disabled={pendingId === r.player_id}
            onClick={() => handleRemove(r.player_id, r.full_name)}
          >
            {pendingId === r.player_id ? (
              <MdAutorenew className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <MdDelete className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
        </li>
      ))}
    </ul>
  );
}
