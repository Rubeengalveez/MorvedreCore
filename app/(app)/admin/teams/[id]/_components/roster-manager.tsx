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
import {
  rosterPlayer,
  unrosterPlayer,
} from "@/server/actions/admin";

const dorsalPattern = /^\d{1,2}$/;

const rosterSchema = z.object({
  player_id: z.string().uuid("Jugador inválido."),
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

async function submitAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const teamId = String(formData.get("team_id") ?? "");
  const squad = formData.get("squad_number");
  const squadNumber =
    squad && String(squad).trim() !== "" ? Number(squad) : undefined;
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

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
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

export function RosterAddSheet({
  teamId,
  candidates,
  trigger,
}: RosterAddSheetProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    submitAction,
    null,
  );
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  const form = useForm<RosterValues>({
    resolver: zodResolver(rosterSchema),
    defaultValues: { player_id: "", squad_number: "" },
  });

  useEffect(() => {
    if (state?.ok) {
      form.reset({ player_id: "", squad_number: "" });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      setSearch("");
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
    <Sheet open={open} onOpenChange={setOpen}>
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
              id={`roster-form-${teamId}`}
              onSubmit={onSubmit}
              className="flex flex-col gap-4 pb-2"
              noValidate
            >
              {state?.error ? (
                <p className="text-sm font-medium text-danger">{state.error}</p>
              ) : null}

              <FormField
                control={form.control}
                name="player_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jugador</FormLabel>
                    <FormControl>
                      <div className="flex flex-col gap-2">
                        <Input
                          type="search"
                          placeholder="Buscar por nombre"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                        <select
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          className="flex h-12 min-h-12 w-full rounded border border-ink-300 bg-paper px-4 py-2 text-base text-ink-900"
                          size={Math.min(8, Math.max(3, filtered.length))}
                        >
                          <option value="">Selecciona un jugador</option>
                          {filtered.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.full_name}
                              {c.birth_year ? ` (${c.birth_year})` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
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
          <SubmitButton label="Añadir a la plantilla" />
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

  function handleRemove(playerId: string) {
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
      <p className="text-sm italic text-ink-600">
        La plantilla está vacía. Añade el primer jugador con el botón de arriba.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li
          key={r.player_id}
          className="flex items-center gap-3 rounded-md border border-ink-300 bg-paper px-4 py-3"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-brand-foam font-mono text-base font-bold text-brand-deep">
            {r.squad_number ?? "—"}
          </span>
          <div className="flex flex-1 flex-col">
            <span className="font-display text-base font-bold text-brand-deep">
              {r.full_name}
            </span>
            <span className="text-xs text-ink-600">
              {r.birth_year ?? "?"} · {r.categoryLabel}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-12 w-12 p-0 text-danger hover:bg-danger/10"
            aria-label={`Quitar a ${r.full_name}`}
            disabled={pendingId === r.player_id}
            onClick={() => handleRemove(r.player_id)}
          >
            {pendingId === r.player_id ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
        </li>
      ))}
    </ul>
  );
}
