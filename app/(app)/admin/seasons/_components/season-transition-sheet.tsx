"use client";

import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { archiveSeason, type ArchiveSeasonResult, type Season } from "@/server/actions/admin";

type State =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; result: ArchiveSeasonResult };

async function submitTransition(_state: State, formData: FormData): Promise<State> {
  try {
    const result = await archiveSeason({
      season_id: String(formData.get("season_id") ?? ""),
      label: String(formData.get("label") ?? ""),
      start_date: String(formData.get("start_date") ?? ""),
      end_date: String(formData.get("end_date") ?? ""),
      confirmation: String(formData.get("confirmation") ?? ""),
    });
    return { status: "success", result };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "No pudimos iniciar la nueva temporada.",
    };
  }
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" size="lg" className="w-full" disabled={pending}>
      {pending ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      ) : (
        <ArrowRight className="h-5 w-5" aria-hidden="true" />
      )}
      {pending ? "Archivando y preparando..." : "Iniciar nueva temporada"}
    </Button>
  );
}

export function SeasonTransitionSheet({
  season,
  draft,
}: {
  season: Season;
  draft: { label: string; start_date: string; end_date: string };
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<State, FormData>(submitTransition, {
    status: "idle",
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="gold" size="md" className="w-full shrink-0 sm:w-auto">
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
          Iniciar nueva temporada
        </Button>
      </SheetTrigger>
      <SheetContent size="md">
        <SheetHeader>
          <SheetTitle>Pasar de {season.label} a la nueva temporada</SheetTitle>
          <SheetDescription>
            Guardaremos los históricos, archivaremos la temporada actual y copiaremos equipos,
            personal y las plantillas que sigan en su categoría.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          {state.status === "success" ? (
            <div className="flex flex-col gap-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <div
                role="status"
                className="border-success/30 bg-success/10 flex items-start gap-3 rounded-lg border p-4"
              >
                <CheckCircle2 className="text-success mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-pool-deep font-extrabold">Nueva temporada preparada</p>
                  <p className="text-ink-600 mt-1 text-sm">
                    {state.result.historical_players} jugadores y {state.result.historical_matchups}{" "}
                    rivalidades archivadas. {state.result.teams_created} equipos creados y{" "}
                    {state.result.rosters_carried} fichas trasladadas.
                  </p>
                </div>
              </div>
              <Button type="button" size="lg" className="w-full" onClick={() => setOpen(false)}>
                Cerrar
              </Button>
            </div>
          ) : (
            <form
              action={formAction}
              className="flex flex-col gap-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
            >
              <input type="hidden" name="season_id" value={season.id} />

              {state.status === "error" ? (
                <Alert variant="danger" title="No pudimos completar la transición">
                  {state.message}
                </Alert>
              ) : null}

              <Alert variant="warning" title="Comprueba antes de continuar">
                Los partidos pendientes, resultados incompletos o actas sin validar bloquearán el
                cierre. La operación completa es transaccional: si algo falla, no se cambia nada.
              </Alert>

              <div className="flex flex-col gap-2">
                <Label htmlFor="new-season-label">Nombre de la nueva temporada</Label>
                <Input id="new-season-label" name="label" defaultValue={draft.label} required />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="new-season-start">Fecha de inicio</Label>
                  <Input
                    id="new-season-start"
                    name="start_date"
                    type="date"
                    defaultValue={draft.start_date}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="new-season-end">Fecha de fin</Label>
                  <Input
                    id="new-season-end"
                    name="end_date"
                    type="date"
                    defaultValue={draft.end_date}
                    required
                  />
                </div>
              </div>

              <div className="border-goggle-red/25 bg-goggle-red/5 flex flex-col gap-2 rounded-lg border p-4">
                <Label htmlFor="season-confirmation">
                  Escribe <strong>{season.label}</strong> para confirmar
                </Label>
                <Input
                  id="season-confirmation"
                  name="confirmation"
                  autoComplete="off"
                  required
                  aria-describedby="season-confirmation-help"
                />
                <p id="season-confirmation-help" className="text-ink-600 text-xs">
                  Esta confirmación evita cerrar una temporada por error.
                </p>
              </div>

              <SubmitButton />
            </form>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
