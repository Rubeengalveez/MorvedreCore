"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CATEGORY_LABELS, type CategoryCode } from "@/lib/domain/categories";
import { upsertTreasuryProfileSettings } from "@/server/actions/admin/treasury";
import type { TreasuryProfileOverview } from "@/server/queries/treasury";

export function TreasuryProfileManager({
  players,
  payerOptions,
}: {
  players: TreasuryProfileOverview[];
  payerOptions: Array<{ id: string; full_name: string }>;
}) {
  const INITIAL_PAGE_SIZE = 24;
  const [pageSize, setPageSize] = useState(INITIAL_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(
    () => [...new Set(players.map((player) => player.category_code))],
    [players],
  );
  const visible = useMemo(
    () =>
      players.filter(
        (player) =>
          (category === "all" || player.category_code === category) &&
          player.full_name.toLocaleLowerCase("es-ES").includes(search.toLocaleLowerCase("es-ES")),
      ),
    [players, category, search],
  );

  const displayed = useMemo(() => visible.slice(0, pageSize), [visible, pageSize]);
  const hasMore = visible.length > pageSize;

  return (
    <section className="flex flex-col gap-3" aria-labelledby="treasury-players-title">
      <div className="px-1">
        <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">Cobros</p>
        <h2
          id="treasury-players-title"
          className="font-display text-pool-deep text-xl font-extrabold"
        >
          Cuota de cada jugador
        </h2>
        <p className="text-ink-600 mt-1 text-sm">
          La cuota normal es 60 €. Solo necesitas tocar las excepciones.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_12rem]">
        <label className="border-ink-300 bg-paper-card focus-within:ring-pool-blue flex min-h-12 items-center gap-2 rounded-xl border px-3 focus-within:ring-2">
          <Search className="text-ink-500 h-5 w-5" aria-hidden="true" />
          <span className="sr-only">Buscar jugador</span>
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPageSize(INITIAL_PAGE_SIZE);
            }}
            aria-label="Buscar jugador"
            placeholder="Buscar por nombre"
            className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none"
          />
        </label>
        <Select
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setPageSize(INITIAL_PAGE_SIZE);
          }}
          aria-label="Filtrar por categoría"
        >
          <option value="all">Todas las categorías</option>
          {categories.map((code) => (
            <option key={code} value={code}>
              {CATEGORY_LABELS[code as CategoryCode] ?? code}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex items-center justify-between px-1 text-xs">
        <p className="text-ink-500 font-bold">
          Mostrando {displayed.length} de {visible.length} jugadores
        </p>
        {visible.length > displayed.length ? (
          <button
            type="button"
            onClick={() => setPageSize(visible.length)}
            className="text-pool-blue focus-visible:ring-pool-blue inline-flex min-h-12 touch-manipulation items-center rounded-lg px-2 font-extrabold hover:underline focus-visible:ring-2 focus-visible:outline-none"
          >
            Ver todos ({visible.length})
          </button>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {displayed.map((player) => (
          <TreasuryPlayerCard key={player.id} player={player} payerOptions={payerOptions} />
        ))}
      </div>
      {hasMore ? (
        <div className="mt-2 flex justify-center pb-4">
          <Button
            type="button"
            variant="secondary"
            className="min-h-12 w-full max-w-sm rounded-xl font-extrabold"
            onClick={() => setPageSize((prev) => prev + INITIAL_PAGE_SIZE)}
          >
            Cargar más jugadores ({visible.length - pageSize} restantes)
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function TreasuryPlayerCard({
  player,
  payerOptions,
}: {
  player: TreasuryProfileOverview;
  payerOptions: Array<{ id: string; full_name: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="border-ink-200 bg-paper-card rounded-2xl border p-4 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setError(null);
        setSaved(false);
        startTransition(async () => {
          try {
            await upsertTreasuryProfileSettings({
              profile_id: player.id,
              monthly_fee_eur: Number(data.get("monthly_fee_eur") ?? 60),
              fee_exempt: data.get("fee_exempt") === "on",
              billing_profile_id: String(data.get("billing_profile_id") ?? "") || null,
            });
            setSaved(true);
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : "No pudimos guardar.");
          }
        });
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-pool-deep truncate font-extrabold">{player.full_name}</h3>
          <p className="text-ink-500 mt-0.5 text-xs font-semibold">{player.team_label}</p>
        </div>
        {saved ? (
          <span className="text-success inline-flex items-center gap-1 text-xs font-extrabold">
            <Check className="h-4 w-4" /> Guardado
          </span>
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <label className="text-ink-700 text-sm font-bold">
          Cuota mensual
          <span className="mt-1 flex items-center gap-2">
            <Input
              name="monthly_fee_eur"
              type="number"
              min="0"
              max="1000"
              step="0.01"
              defaultValue={(player.monthly_fee_cents / 100).toFixed(2)}
              className="font-mono"
            />
            <span>€</span>
          </span>
        </label>
        <label className="border-ink-300 flex min-h-12 items-center gap-2 rounded-xl border px-3 text-sm font-extrabold">
          <input
            name="fee_exempt"
            type="checkbox"
            defaultChecked={player.fee_exempt}
            className="h-5 w-5"
          />
          No paga
        </label>
      </div>
      <label className="text-ink-700 mt-3 block text-sm font-bold">
        Se cobra junto a
        <Select
          name="billing_profile_id"
          defaultValue={player.billing_profile_id ?? ""}
          className="mt-1"
        >
          <option value="">Este jugador</option>
          {payerOptions.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.full_name}
            </option>
          ))}
        </Select>
      </label>
      {error ? <p className="text-danger mt-2 text-sm font-bold">{error}</p> : null}
      <Button type="submit" variant="secondary" className="mt-3 w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
        Guardar este jugador
      </Button>
    </form>
  );
}
