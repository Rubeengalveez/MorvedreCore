"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { CheckCircle2, ChevronRight, RotateCcw, Save, Search, X } from "lucide-react";

import { createSwimTime } from "@/server/actions/swim-times";
import { describeSwimTime, formatSwimTime, normalizeSearchTerm, parseSwimTime } from "@/lib/domain/swim-times";

type Player = {
  player_id: string;
  full_name: string;
  photo_url: string | null;
  cap_number: number | null;
  squad_number: number | null;
};

type ExistingEntry = {
  id: string;
  revision: number;
  player_id: string;
  test_date: string;
  time_50_cs: number | null;
  time_100_cs: number | null;
};

interface SwimTimeEntryListProps {
  teamId: string;
  teamColor: string;
  players: Player[];
  today: string;
  existingEntries: ExistingEntry[];
}

export function SwimTimeEntryList({
  teamId,
  players,
  today,
  existingEntries,
}: SwimTimeEntryListProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [distance, setDistance] = useState<50 | 100>(50);
  const [minutesInput, setMinutesInput] = useState("");
  const [secondsInput, setSecondsInput] = useState("");
  const [hundredthsInput, setHundredthsInput] = useState("");
  const [search, setSearch] = useState("");
  const [warningAccepted, setWarningAccepted] = useState(false);
  const [error, setError] = useState("");
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [todayEntries, setTodayEntries] = useState<ExistingEntry[]>(existingEntries);
  const [isPending, startTransition] = useTransition();
  const operationId = useRef<string | null>(null);

  const selectedPlayer = useMemo(
    () => players.find((p) => p.player_id === selectedPlayerId) ?? null,
    [players, selectedPlayerId],
  );

  const filteredPlayers = useMemo(() => {
    const query = normalizeSearchTerm(search);
    if (!query) return players;
    const cleanCapQuery = query.replace(/^#/, "");
    return players.filter((player) => {
      const nameMatch = normalizeSearchTerm(player.full_name).includes(query);
      const cap = player.cap_number ?? player.squad_number;
      const capMatch = cap != null && cap.toString() === cleanCapQuery;
      return nameMatch || capMatch;
    });
  }, [players, search]);

  const timesTodayByPlayer = useMemo(() => {
    const map = new Map<string, { time50?: number; time100?: number }>();
    for (const entry of todayEntries) {
      const current = map.get(entry.player_id) ?? {};
      if (entry.time_50_cs != null && current.time50 == null) current.time50 = entry.time_50_cs;
      if (entry.time_100_cs != null && current.time100 == null) current.time100 = entry.time_100_cs;
      map.set(entry.player_id, current);
    }
    return map;
  }, [todayEntries]);

  const parsedTime = useMemo(() => {
    if (!minutesInput && !secondsInput && !hundredthsInput) return null;
    const minutes = Number(minutesInput || "0");
    const seconds = Number(secondsInput || "0");
    const hundredths = Number(hundredthsInput || "0");
    if (seconds > 59 || hundredths > 99) return null;
    return parseSwimTime(
      `${minutes}:${seconds.toString().padStart(2, "0")}.${hundredths.toString().padStart(2, "0")}`,
      distance,
    );
  }, [distance, hundredthsInput, minutesInput, secondsInput]);

  const hasTimeInput = Boolean(minutesInput || secondsInput || hundredthsInput);

  function clearTime() {
    setMinutesInput("");
    setSecondsInput("");
    setHundredthsInput("");
  }

  function keepDigits(value: string, length: number) {
    return value.replace(/\D/g, "").slice(0, length);
  }

  function handleSelectPlayer(id: string) {
    setSelectedPlayerId(id);
    clearTime();
    setError("");
    setWarningAccepted(false);
  }

  function handleSave() {
    if (!selectedPlayer) {
      setError("Selecciona primero un jugador.");
      return;
    }
    if (!parsedTime) {
      setError(
        hasTimeInput
          ? "Revisa el tiempo: los segundos deben estar entre 0 y 59."
          : "Escribe el tiempo antes de guardar.",
      );
      return;
    }
    if (!parsedTime.ok) {
      setError(parsedTime.message);
      return;
    }
    if (parsedTime.warning && !warningAccepted) {
      setWarningAccepted(true);
      setError("El tiempo es poco habitual. Revisa y pulsa GUARDAR otra vez para confirmar.");
      return;
    }

    setError("");
    const centiseconds = parsedTime.centiseconds;
    const time50Cs = distance === 50 ? centiseconds : null;
    const time100Cs = distance === 100 ? centiseconds : null;

    startTransition(async () => {
      const result = await createSwimTime({
        teamId,
        playerId: selectedPlayer.player_id,
        operationId: (operationId.current = crypto.randomUUID()),
        testDate: today,
        time50Cs,
        time100Cs,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setTodayEntries((prev) => [
        {
          id: result.entryId,
          revision: result.revision,
          player_id: selectedPlayer.player_id,
          test_date: today,
          time_50_cs: time50Cs,
          time_100_cs: time100Cs,
        },
        ...prev,
      ]);

      const formatted = formatSwimTime(centiseconds);
      setSuccessBanner(
        `¡Guardado para ${selectedPlayer.full_name}: ${distance} m en ${formatted}!`,
      );
      clearTime();
      setWarningAccepted(false);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Banner de éxito grande */}
      {successBanner ? (
        <div
          role="status"
          className="bg-emerald-600 text-paper flex items-center justify-between gap-3 rounded-2xl p-4 shadow-md text-lg sm:text-xl font-black animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-200" aria-hidden="true" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="hover:bg-emerald-700 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors"
            aria-label="Cerrar aviso"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {/* PASO 1: Selección de Jugador */}
      <section
        className={`border-ink-200 bg-paper-card rounded-2xl border shadow-xs ${selectedPlayer ? "p-2.5" : "p-4 sm:p-5"}`}
        aria-label={selectedPlayer ? "Jugador seleccionado" : undefined}
        aria-labelledby={selectedPlayer ? undefined : "step-player-heading"}
      >
        <div className={`items-center justify-between gap-3 ${selectedPlayer ? "hidden" : "mb-3 flex"}`}>
          <h2
            id="step-player-heading"
            className="text-pool-deep text-base sm:text-lg font-black uppercase tracking-wide flex items-center gap-2"
          >
            <span className="bg-pool-deep text-paper flex h-6 w-6 items-center justify-center rounded-full text-xs font-black">
              1
            </span>
            {selectedPlayer ? "Jugador seleccionado" : "Elige el jugador"}
          </h2>
        </div>

        {selectedPlayer ? (
          /* Jugador seleccionado en tarjeta elegante y legible */
          <div className="bg-pool-foam/40 border-pool-blue/30 flex items-center justify-between gap-3 rounded-xl border p-2">
            <div className="flex items-center gap-3 min-w-0">
              <span className="bg-pool-deep text-paper flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base font-black shadow-xs">
                {selectedPlayer.cap_number != null
                  ? `#${selectedPlayer.cap_number}`
                  : selectedPlayer.full_name.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="text-ink-900 truncate text-base font-extrabold leading-snug sm:text-lg">
                  {selectedPlayer.full_name}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedPlayerId(null);
                clearTime();
                setError("");
              }}
              className="text-pool-blue hover:text-paper hover:bg-pool-blue bg-paper border-pool-blue/30 flex min-h-10 shrink-0 touch-manipulation items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-bold shadow-xs transition-colors"
              aria-label="Cambiar jugador seleccionado"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Cambiar</span>
            </button>
          </div>
        ) : (
          /* Lista de selección de jugadores */
          <div className="flex flex-col gap-3">
            {players.length > 8 ? (
              <label className="relative block">
                <span className="sr-only">Buscar jugador</span>
                <Search
                  className="text-ink-400 pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre..."
                  className="border-ink-300 bg-paper text-ink-900 focus:border-pool-blue focus:ring-pool-blue h-12 w-full rounded-xl border pl-11 pr-4 text-base font-bold focus:ring-2 focus:outline-none"
                />
              </label>
            ) : null}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {filteredPlayers.map((player) => {
                const recorded = timesTodayByPlayer.get(player.player_id);
                const cap = player.cap_number ?? player.squad_number;
                return (
                  <button
                    key={player.player_id}
                    type="button"
                    onClick={() => handleSelectPlayer(player.player_id)}
                    className="border-ink-200 hover:border-pool-blue hover:bg-pool-foam/30 active:bg-pool-foam focus-visible:ring-pool-blue flex min-h-14 touch-manipulation items-center justify-between gap-3 rounded-xl border bg-paper p-2.5 text-left transition-all focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="bg-pool-deep text-paper flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-base font-black">
                        {cap != null ? cap : player.full_name.charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <span className="block text-ink-900 font-extrabold text-base truncate">
                          {player.full_name}
                        </span>
                        {recorded?.time50 != null || recorded?.time100 != null ? (
                          <span className="text-emerald-700 text-xs font-bold block">
                            Hoy: {recorded.time50 != null ? `50m (${formatSwimTime(recorded.time50)})` : ""}
                            {recorded.time50 != null && recorded.time100 != null ? " · " : ""}
                            {recorded.time100 != null ? `100m (${formatSwimTime(recorded.time100)})` : ""}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-ink-400 shrink-0" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* PASO 2 y 3: Distancia y Tiempo (Solo cuando hay jugador seleccionado) */}
      {selectedPlayer ? (
        <section
          className="border-ink-200 bg-paper-card flex flex-col gap-3 rounded-2xl border p-3 shadow-xs sm:p-4"
          aria-labelledby="step-time-heading"
        >
          {/* Paso 2: Distancia */}
          <div>
            <h2
              id="step-time-heading"
              className="text-pool-deep mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wide sm:text-base"
            >
              <span className="bg-pool-deep text-paper flex h-6 w-6 items-center justify-center rounded-full text-xs font-black">
                2
              </span>
              Distancia
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setDistance(50);
                  setError("");
                }}
                className={`min-h-12 touch-manipulation rounded-xl border flex flex-col items-center justify-center p-1.5 transition-all ${
                  distance === 50
                    ? "bg-pool-deep text-paper border-pool-deep shadow-xs ring-2 ring-pool-deep/20"
                    : "bg-paper text-ink-700 border-ink-200 hover:border-ink-300"
                }`}
              >
                <span className="text-lg font-black tracking-wide sm:text-xl">50 m</span>
                <span className="hidden text-xs font-bold uppercase tracking-wider opacity-80 sm:block">
                  2 largos
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDistance(100);
                  setError("");
                }}
                className={`min-h-12 touch-manipulation rounded-xl border flex flex-col items-center justify-center p-1.5 transition-all ${
                  distance === 100
                    ? "bg-pool-deep text-paper border-pool-deep shadow-xs ring-2 ring-pool-deep/20"
                    : "bg-paper text-ink-700 border-ink-200 hover:border-ink-300"
                }`}
              >
                <span className="text-lg font-black tracking-wide sm:text-xl">100 m</span>
                <span className="hidden text-xs font-bold uppercase tracking-wider opacity-80 sm:block">
                  4 largos
                </span>
              </button>
            </div>
          </div>

          {/* Paso 3: Tiempo */}
          <div>
            <h2 className="text-pool-deep mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wide sm:text-base">
              <span className="bg-pool-deep text-paper flex h-6 w-6 items-center justify-center rounded-full text-xs font-black">
                3
              </span>
              Tiempo conseguido
            </h2>

            <div className="bg-paper-sunk border-ink-200 flex flex-col items-center gap-1.5 rounded-xl border p-2.5 sm:p-3">
              <div className="grid w-full max-w-sm grid-cols-3 gap-2">
                <label className="flex flex-col gap-1 text-center">
                  <span className="text-ink-600 text-[10px] font-extrabold uppercase sm:text-xs">Minutos</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={minutesInput}
                    onChange={(event) => {
                      setMinutesInput(keepDigits(event.target.value, 2));
                      setError("");
                      setWarningAccepted(false);
                    }}
                    placeholder="0"
                    aria-label="Minutos"
                    className="bg-paper text-pool-deep border-pool-blue h-12 w-full rounded-xl border-2 text-center font-mono text-2xl font-black tabular-nums shadow-inner focus:ring-4 focus:ring-pool-blue/20 focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-center">
                  <span className="text-ink-600 text-[10px] font-extrabold uppercase sm:text-xs">Segundos</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={secondsInput}
                    onChange={(event) => {
                      setSecondsInput(keepDigits(event.target.value, 2));
                      setError("");
                      setWarningAccepted(false);
                    }}
                    placeholder={distance === 50 ? "34" : "15"}
                    aria-label="Segundos"
                    className="bg-paper text-pool-deep border-pool-blue h-12 w-full rounded-xl border-2 text-center font-mono text-2xl font-black tabular-nums shadow-inner focus:ring-4 focus:ring-pool-blue/20 focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-1 text-center">
                  <span className="text-ink-600 text-[10px] font-extrabold uppercase sm:text-xs">Centésimas</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={hundredthsInput}
                    onChange={(event) => {
                      setHundredthsInput(keepDigits(event.target.value, 2));
                      setError("");
                      setWarningAccepted(false);
                    }}
                    placeholder="00"
                    aria-label="Centésimas"
                    className="bg-paper text-pool-deep border-pool-blue h-12 w-full rounded-xl border-2 text-center font-mono text-2xl font-black tabular-nums shadow-inner focus:ring-4 focus:ring-pool-blue/20 focus:outline-none"
                  />
                </label>
              </div>

              {parsedTime?.ok ? (
                <p className="mt-1 text-center text-base font-extrabold text-emerald-700 sm:text-lg">
                  ✓ {describeSwimTime(parsedTime.centiseconds)}
                </p>
              ) : (
                <p className="text-ink-500 mt-1 text-center text-sm font-bold">
                  Las centésimas son opcionales
                </p>
              )}
            </div>
          </div>

          {/* Mensajes de error o confirmación */}
          {error ? (
            <div
              role="alert"
              className={`p-3.5 rounded-xl text-base font-bold ${
                warningAccepted
                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                  : "bg-rose-100 text-rose-900 border border-rose-300"
              }`}
            >
              {error}
            </div>
          ) : null}

          {/* Paso 4: Botón Guardar */}
          <button
            type="button"
            disabled={isPending || !hasTimeInput}
            onClick={handleSave}
            className={`min-h-12 touch-manipulation w-full rounded-xl text-base sm:text-lg font-black text-paper shadow-md flex items-center justify-center gap-2.5 transition-all ${
              isPending || !hasTimeInput
                ? "bg-ink-300 cursor-not-allowed opacity-60"
                : "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]"
            }`}
          >
            <Save className="h-6 w-6" aria-hidden="true" />
            {isPending
              ? "Guardando..."
              : warningAccepted
                ? "Confirmar y Guardar Tiempo"
                : "GUARDAR TIEMPO"}
          </button>
        </section>
      ) : null}

      {selectedPlayer ? (
        <section className="border-ink-200 bg-paper-card rounded-2xl border p-3 shadow-xs">
          <h2 className="text-pool-deep text-sm font-black uppercase tracking-wide">
            Tiempos de hoy
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {([50, 100] as const).map((meters) => {
              const recorded = timesTodayByPlayer.get(selectedPlayer.player_id);
              const value = meters === 50 ? recorded?.time50 : recorded?.time100;
              return (
                <div
                  key={meters}
                  className={`flex min-h-14 items-center justify-between rounded-xl border px-3 ${
                    value == null
                      ? "border-ink-200 bg-paper-sunk text-ink-500"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  <span className="font-black">{meters} m</span>
                  <span className="text-sm font-extrabold tabular-nums">
                    {value == null ? "Pendiente" : formatSwimTime(value)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Historial de tiempos registrados hoy */}
      {todayEntries.length > 0 && !selectedPlayer ? (
        <section
          className="border-ink-200 bg-paper-card rounded-2xl border p-4 sm:p-5 shadow-sm"
          aria-labelledby="today-times-heading"
        >
          <h2
            id="today-times-heading"
            className="text-pool-deep text-base sm:text-lg font-black uppercase tracking-wider mb-3 flex items-center justify-between"
          >
            <span>Tiempos registrados hoy ({todayEntries.length})</span>
          </h2>

          <div className="divide-ink-200 divide-y">
            {todayEntries.map((entry) => {
              const player = players.find((p) => p.player_id === entry.player_id);
              const name = player?.full_name ?? "Jugador";
              const cap = player?.cap_number ?? player?.squad_number;
              return (
                <div
                  key={entry.id}
                  className="py-3 flex items-center justify-between gap-3 text-base"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="bg-pool-foam text-pool-deep flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black">
                      {cap != null ? `#${cap}` : "•"}
                    </span>
                    <span className="font-extrabold text-ink-900 truncate">{name}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {entry.time_50_cs != null ? (
                      <span className="bg-pool-deep text-paper px-2.5 py-1 rounded-lg text-sm sm:text-base font-black tabular-nums">
                        50m: {formatSwimTime(entry.time_50_cs)}
                      </span>
                    ) : null}
                    {entry.time_100_cs != null ? (
                      <span className="bg-pool-deep text-paper px-2.5 py-1 rounded-lg text-sm sm:text-base font-black tabular-nums">
                        100m: {formatSwimTime(entry.time_100_cs)}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
