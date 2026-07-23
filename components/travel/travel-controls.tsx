"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CarFront, LoaderCircle, Plus, Settings2, UserPlus, X } from "lucide-react";

import {
  addTravelCompanion,
  cancelTravelCompanion,
  cancelTravelOffer,
  cancelTravelReservation,
  configureMatchTravel,
  createTravelOffer,
  reserveTravelSeat,
  type TravelActionState,
} from "@/server/actions/travel";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TravelControlsProps {
  matchId: string;
  defaultMeetingPoint: string;
  compensationCents: number;
  logisticsEnabled: boolean;
  isManager: boolean;
  departureAtDefault: string;
}

export function TravelControls({
  matchId,
  defaultMeetingPoint,
  compensationCents,
  logisticsEnabled,
  isManager,
  departureAtDefault,
}: TravelControlsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<TravelActionState | null>(null);
  const [showOffer, setShowOffer] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  function run(action: () => Promise<TravelActionState>) {
    startTransition(async () => {
      const result = await action();
      setState(result);
      if (result.ok) {
        setShowOffer(false);
        router.refresh();
      }
    });
  }

  function submitOffer(formData: FormData) {
    run(() =>
      createTravelOffer({
        match_id: matchId,
        vehicle_label: formData.get("vehicle_label"),
        seats_total: formData.get("seats_total"),
        departure_from: formData.get("departure_from"),
        departure_at: new Date(String(formData.get("departure_at"))).toISOString(),
        notes: formData.get("notes"),
      }),
    );
  }

  function submitSettings(formData: FormData) {
    run(() =>
      configureMatchTravel({
        match_id: matchId,
        logistics_enabled: formData.get("logistics_enabled") === "on",
        travel_meeting_point: formData.get("travel_meeting_point"),
        travel_compensation_cents: Math.round(
          Number(formData.get("travel_compensation_euros")) * 100,
        ),
      }),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {state ? (
        <Alert variant={state.ok ? "success" : "danger"}>
          {state.ok ? state.message : state.error}
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {logisticsEnabled ? (
          <Button type="button" onClick={() => setShowOffer((value) => !value)} disabled={pending}>
            {showOffer ? <X className="h-5 w-5" /> : <CarFront className="h-5 w-5" />}
            {showOffer ? "Cerrar formulario" : "Ofrecer mi coche"}
          </Button>
        ) : null}
        {isManager ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowSettings((value) => !value)}
            disabled={pending}
          >
            <Settings2 className="h-5 w-5" />
            Configurar
          </Button>
        ) : null}
      </div>

      {showOffer ? (
        <form
          action={submitOffer}
          className="border-ink-200 bg-paper-card flex flex-col gap-4 rounded-lg border p-4"
        >
          <div>
            <label htmlFor="vehicle_label" className="text-ink-900 mb-1.5 block text-sm font-bold">
              Vehículo
            </label>
            <Input
              id="vehicle_label"
              name="vehicle_label"
              placeholder="Seat León blanco"
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2">
            <div>
              <label htmlFor="seats_total" className="text-ink-900 mb-1.5 block text-sm font-bold">
                Plazas libres
              </label>
              <Input
                id="seats_total"
                name="seats_total"
                type="number"
                min={1}
                max={6}
                defaultValue={3}
                required
              />
            </div>
            <div>
              <label htmlFor="departure_at" className="text-ink-900 mb-1.5 block text-sm font-bold">
                Hora de salida
              </label>
              <Input
                id="departure_at"
                name="departure_at"
                type="datetime-local"
                defaultValue={departureAtDefault}
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="departure_from" className="text-ink-900 mb-1.5 block text-sm font-bold">
              Salgo desde
            </label>
            <Input
              id="departure_from"
              name="departure_from"
              defaultValue={defaultMeetingPoint}
              required
            />
          </div>
          <div>
            <label htmlFor="travel_notes" className="text-ink-900 mb-1.5 block text-sm font-bold">
              Nota opcional
            </label>
            <Input
              id="travel_notes"
              name="notes"
              maxLength={300}
              placeholder="Silla infantil, espacio para mochilas..."
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
            Publicar coche
          </Button>
        </form>
      ) : null}

      {showSettings ? (
        <form
          action={submitSettings}
          className="border-ink-200 bg-paper-card flex flex-col gap-4 rounded-lg border p-4"
        >
          <label className="flex min-h-12 items-center justify-between gap-4">
            <span className="text-ink-900 text-sm font-bold">Logística activa</span>
            <input
              name="logistics_enabled"
              type="checkbox"
              defaultChecked={logisticsEnabled}
              className="accent-pool-blue h-6 w-6"
            />
          </label>
          <div>
            <label
              htmlFor="travel_meeting_point"
              className="text-ink-900 mb-1.5 block text-sm font-bold"
            >
              Punto de encuentro
            </label>
            <Input
              id="travel_meeting_point"
              name="travel_meeting_point"
              defaultValue={defaultMeetingPoint}
              required
            />
          </div>
          <div>
            <label
              htmlFor="travel_compensation_euros"
              className="text-ink-900 mb-1.5 block text-sm font-bold"
            >
              Compensación por coche
            </label>
            <Input
              id="travel_compensation_euros"
              name="travel_compensation_euros"
              type="number"
              min={0}
              max={1000}
              step="0.01"
              defaultValue={(compensationCents / 100).toFixed(2)}
              required
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <Settings2 className="h-5 w-5" />
            )}
            Guardar configuración
          </Button>
        </form>
      ) : null}
    </div>
  );
}

export function TravelReservationButton({
  offerId,
  playerId,
  playerName,
  reserved,
  disabled,
  reserveLabel = "Reservar plaza",
  cancelLabel = "Liberar mi plaza",
  onAction,
}: {
  offerId: string;
  playerId: string;
  playerName?: string;
  reserved: boolean;
  disabled: boolean;
  reserveLabel?: string;
  cancelLabel?: string;
  onAction?: (result: TravelActionState) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      const result = reserved
        ? await cancelTravelReservation({ offer_id: offerId, player_id: playerId })
        : await reserveTravelSeat({ offer_id: offerId, player_id: playerId });
      if (!result.ok) {
        setError(result.error);
        onAction?.(result);
      } else {
        setError(null);
        onAction?.(result);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant={reserved ? "secondary" : "primary"}
        onClick={handleClick}
        disabled={pending || disabled}
        className="w-full"
      >
        {pending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : null}
        {reserved ? cancelLabel : reserveLabel}
        {playerName && !reserved ? `: ${playerName}` : ""}
      </Button>
      {error ? <p className="text-danger text-sm font-semibold">{error}</p> : null}
    </div>
  );
}

export function AddCompanionForm({
  offerId,
  playerId,
  defaultName,
}: {
  offerId: string;
  playerId: string;
  defaultName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(defaultName);

  function handleSubmit() {
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await addTravelCompanion({
        offer_id: offerId,
        player_id: playerId,
        full_name: name.trim(),
      });
      if (!result.ok) {
        setError(result.error);
      } else {
        setError(null);
        setOpen(false);
        router.refresh();
      }
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="self-start"
      >
        <UserPlus className="h-4 w-4" />
        Añadir acompañante
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del acompañante"
          maxLength={80}
          className="flex-1"
          autoFocus
        />
        <Button
          type="button"
          size="sm"
          onClick={handleSubmit}
          disabled={pending || !name.trim()}
        >
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Añadir
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {error ? <p className="text-danger text-sm font-semibold">{error}</p> : null}
    </div>
  );
}

export function CancelCompanionButton({ companionId }: { companionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        startTransition(async () => {
          const result = await cancelTravelCompanion({ companion_id: companionId });
          if (result.ok) router.refresh();
        });
      }}
      disabled={pending}
      className="text-danger hover:bg-danger-50 focus-visible:ring-danger inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
    >
      {pending ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
      Quitar
    </button>
  );
}

export function CancelTravelOfferButton({ offerId }: { offerId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="bg-danger-50 border-danger-200 flex flex-col gap-2 rounded-xl border p-3">
        <p className="text-danger text-sm font-bold">
          ¿Cancelar este coche? Se liberarán todas las plazas reservadas.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="danger"
            size="sm"
            className="flex-1"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const result = await cancelTravelOffer({ offer_id: offerId });
                if (result.ok) router.refresh();
              });
            }}
          >
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            Sí, cancelar
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="flex-1"
            disabled={pending}
            onClick={() => setConfirming(false)}
          >
            Volver
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => setConfirming(true)}
    >
      <X className="h-4 w-4" />
      Cancelar coche
    </Button>
  );
}
