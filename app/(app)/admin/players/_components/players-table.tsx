"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Search,
  SlidersHorizontal,
  UserRound,
  UserRoundCheck,
  UserRoundMinus,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import { CategoryBadge } from "@/components/team/category-badge";
import {
  teamControl,
  teamPrimary,
  teamSecondary,
  TeamEmpty,
  TeamField,
} from "@/components/team/team-ui";
import { CATEGORY_LABELS, type CategoryCode } from "@/lib/domain/categories";
import { playerListHref, type PlayerFilters } from "@/lib/domain/admin-players";
import { cn } from "@/lib/utils/cn";
import { setPlayerActive } from "@/server/actions/admin/players";
import { PlayerFormSheet, type PlayerTeam } from "./player-form-sheet";

export interface PlayerRow {
  id: string;
  full_name: string;
  birth_year: number | null;
  photo_url: string | null;
  cap_number: number | null;
  gender: string | null;
  phone_e164: string | null;
  email_contact: string | null;
  notes: string | null;
  school_enrolled: boolean;
  school_payment_paid: boolean;
  is_active: boolean;
  currentTeam: string | null;
  categoryLabel: string;
  category: CategoryCode | null;
}

export function PlayersTable({
  players,
  teams,
  total,
  totalPages,
  filters,
  seasonYear,
}: {
  players: PlayerRow[];
  teams: PlayerTeam[];
  total: number;
  totalPages: number;
  filters: PlayerFilters;
  seasonYear: number;
}) {
  const router = useRouter();
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const [query, setQuery] = useState(filters.query);
  const [editing, setEditing] = useState<PlayerRow | null>(null);
  const [changing, setChanging] = useState<PlayerRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const activeFilters =
    Number(filters.status !== "active") +
    Number(Boolean(filters.teamId)) +
    Number(Boolean(filters.category));

  function navigate(next: PlayerFilters) {
    startTransition(() => router.push(playerListHref(next) as Route));
  }
  async function changeStatus() {
    if (!changing || busy.current) return;
    busy.current = true;
    setError(null);
    startTransition(async () => {
      try {
        await setPlayerActive({ profile_id: changing.id, active: !changing.is_active });
        setChanging(null);
        router.refresh();
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "No pudimos cambiar el estado. Vuelve a intentarlo.",
        );
      } finally {
        busy.current = false;
      }
    });
  }

  return (
    <>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          navigate({ ...filters, query: query.trim().slice(0, 100), page: 1 });
        }}
        className="flex gap-2"
      >
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="text-pool-deep pointer-events-none absolute top-4 left-3 h-5 w-5"
          />
          <label className="sr-only" htmlFor="player-search">
            Buscar jugadores por nombre, categoría o equipo
          </label>
          <input
            id="player-search"
            type="search"
            maxLength={100}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={`${teamControl} pr-14 pl-10`}
            placeholder="Buscar…"
          />
          <button
            type="submit"
            disabled={pending}
            aria-label="Buscar jugadores"
            className="text-pool-blue focus-visible:outline-pool-blue absolute top-1 right-1 flex min-h-12 min-w-12 items-center justify-center rounded-lg focus-visible:outline-2"
          >
            {pending ? (
              <Loader2 aria-hidden="true" className="h-5 w-5 motion-safe:animate-spin" />
            ) : (
              <ChevronRight aria-hidden="true" className="h-6 w-6" />
            )}
          </button>
        </div>
        <button
          type="button"
          disabled={pending}
          aria-haspopup="dialog"
          onClick={() => {
            setDraft(filters);
            setFilterOpen(true);
          }}
          className={cn(
            activeFilters ? teamPrimary : teamSecondary,
            "shrink-0 whitespace-nowrap",
            !activeFilters && "bg-pool-ice",
          )}
        >
          <SlidersHorizontal aria-hidden="true" className="h-5 w-5" />
          <span>Filtros{activeFilters ? ` (${activeFilters})` : ""}</span>
        </button>
      </form>
      <div
        className="text-pool-deep flex flex-wrap items-center justify-between gap-2"
        role="status"
        aria-live="polite"
      >
        <span className="border-pool-deep/65 rounded-lg border bg-white px-3 py-2 text-base font-bold">
          {pending ? (
            "Actualizando la lista…"
          ) : (
            <>
              {total} {total === 1 ? "jugador" : "jugadores"}
              {filters.status === "active"
                ? " activos"
                : filters.status === "inactive"
                  ? " desactivados"
                  : ""}
            </>
          )}
        </span>
        {Boolean(filters.query || activeFilters) && (
          <Link
            href="/admin/players"
            aria-label="Quitar filtros y búsqueda"
            className={cn(teamSecondary, "bg-pool-ice whitespace-nowrap")}
          >
            Restablecer
          </Link>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2" aria-busy={pending}>
        {players.map((player) => (
          <PlayerDirectoryCard
            key={player.id}
            player={player}
            onEdit={() => setEditing(player)}
            onStatus={() => {
              setError(null);
              setChanging(player);
            }}
          />
        ))}
      </div>
      {!players.length && (
        <TeamEmpty
          title="No hay jugadores en esta lista"
          description={
            filters.query || activeFilters
              ? "Prueba con otro nombre o quita los filtros."
              : "Registra el primer jugador con el botón Nuevo jugador."
          }
        />
      )}
      {total > 0 && (
        <nav
          aria-label="Paginación de jugadores"
          className="border-pool-deep/65 text-pool-deep rounded-xl border-2 bg-white p-3"
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            {filters.page > 1 ? (
              <Link
                aria-label="Página anterior"
                className={cn(teamSecondary, "gap-1 px-2 whitespace-nowrap")}
                href={playerListHref(filters, filters.page - 1) as Route}
              >
                <ChevronLeft
                  aria-hidden="true"
                  className="hidden h-5 w-5 shrink-0 min-[360px]:block"
                />
                Anterior
              </Link>
            ) : (
              <button disabled className={cn(teamSecondary, "gap-1 px-2 whitespace-nowrap")}>
                <ChevronLeft
                  aria-hidden="true"
                  className="hidden h-5 w-5 shrink-0 min-[360px]:block"
                />
                Anterior
              </button>
            )}
            <span className="text-center font-extrabold whitespace-nowrap tabular-nums">
              {filters.page} / {totalPages}
            </span>
            {filters.page < totalPages ? (
              <Link
                aria-label="Página siguiente"
                className={cn(teamSecondary, "gap-1 px-2 whitespace-nowrap")}
                href={playerListHref(filters, filters.page + 1) as Route}
              >
                Siguiente
                <ChevronRight
                  aria-hidden="true"
                  className="hidden h-5 w-5 shrink-0 min-[360px]:block"
                />
              </Link>
            ) : (
              <button disabled className={cn(teamSecondary, "gap-1 px-2 whitespace-nowrap")}>
                Siguiente
                <ChevronRight
                  aria-hidden="true"
                  className="hidden h-5 w-5 shrink-0 min-[360px]:block"
                />
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-sm font-semibold">
            {(filters.page - 1) * 24 + 1}–{Math.min(filters.page * 24, total)} de {total} jugadores
          </p>
        </nav>
      )}
      <ActaGuardSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        context="Jugadores"
        title="Filtrar jugadores"
        icon="saved"
        body={
          <div className="space-y-4">
            <TeamField label="Estado" htmlFor="player-filter-status">
              <select
                id="player-filter-status"
                value={draft.status}
                onChange={(event) =>
                  setDraft({ ...draft, status: event.target.value as PlayerFilters["status"] })
                }
                className={teamControl}
              >
                <option value="active">Activos</option>
                <option value="inactive">Desactivados</option>
                <option value="all">Todos</option>
              </select>
            </TeamField>
            <TeamField label="Categoría por edad" htmlFor="player-filter-category">
              <select
                id="player-filter-category"
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                className={teamControl}
              >
                <option value="">Todas las categorías</option>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </TeamField>
            <TeamField label="Equipo" htmlFor="player-filter-team">
              <select
                id="player-filter-team"
                value={draft.teamId}
                onChange={(event) => setDraft({ ...draft, teamId: event.target.value })}
                className={teamControl}
              >
                <option value="">Todos los equipos</option>
                <option value="unassigned">Sin equipo</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.label}
                  </option>
                ))}
              </select>
            </TeamField>
          </div>
        }
        actions={[
          {
            label: "Aplicar filtros",
            tone: "primary",
            onClick: () => {
              navigate({ ...draft, query: filters.query, page: 1 });
              setFilterOpen(false);
            },
          },
          {
            label: "Restablecer filtros",
            tone: "subtle",
            onClick: () => setDraft({ ...draft, teamId: "", category: "", status: "active" }),
          },
        ]}
      />
      {editing && (
        <PlayerFormSheet
          key={editing.id}
          player={editing}
          teams={teams}
          seasonYear={seasonYear}
          open
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
      <ActaGuardSheet
        open={Boolean(changing)}
        onOpenChange={(open) => !open && setChanging(null)}
        context="Estado del jugador"
        title={changing?.is_active ? "¿Desactivar jugador?" : "¿Activar jugador?"}
        icon="warning"
        summary={changing?.full_name}
        description={
          changing?.is_active
            ? "Dejará de aparecer entre los jugadores activos. Conservamos su ficha, pedidos y estadísticas. Puedes activarlo de nuevo."
            : "Volverá a aparecer entre los jugadores activos."
        }
        pending={pending}
        error={error}
        actions={[
          {
            label: changing?.is_active ? "Desactivar jugador" : "Activar jugador",
            tone: changing?.is_active ? "danger" : "primary",
            onClick: changeStatus,
          },
          { label: "Cancelar", tone: "secondary", onClick: () => setChanging(null) },
        ]}
      />
    </>
  );
}

function PlayerDirectoryCard({
  player,
  onEdit,
  onStatus,
}: {
  player: PlayerRow;
  onEdit: () => void;
  onStatus: () => void;
}) {
  return (
    <article
      className={`border-pool-deep/65 text-pool-deep overflow-hidden rounded-2xl border-2 ${player.is_active ? "bg-white" : "bg-slate-100"}`}
    >
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Editar ficha de ${player.full_name}`}
        className="focus-visible:outline-pool-blue w-full space-y-3 p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-[-4px]"
      >
        <span className="flex items-center gap-3">
          <Avatar
            src={player.photo_url}
            name={player.full_name}
            size={52}
            teamColor="var(--pool-deep)"
          />
          <span className="min-w-0 flex-1">
            <span className="block text-lg leading-snug font-extrabold">
              <AdaptivePlayerName name={player.full_name} />
            </span>
            <span className="mt-1 block space-y-1 text-sm leading-snug font-semibold">
              {player.currentTeam
                ? player.currentTeam.split(" · ").map((team) => (
                    <span key={team} title={team} className="block truncate">
                      Equipo · {team}
                    </span>
                  ))
                : "Sin equipo asignado"}
            </span>
          </span>
          <ChevronRight aria-hidden="true" className="text-pool-blue mt-1 h-5 w-5 shrink-0" />
        </span>
        <span className="flex items-center justify-between gap-2 whitespace-nowrap">
          <CategoryBadge category={player.category} label={player.categoryLabel} />
          <span className="text-sm font-semibold">
            {player.birth_year ? `Nacido en ${player.birth_year}` : "Sin año"}
          </span>
        </span>
      </button>
      <div className="grid grid-cols-2 gap-2 px-4 pb-4">
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editar a ${player.full_name}`}
          className={cn(teamSecondary, "bg-pool-ice gap-1 px-1 whitespace-nowrap min-[360px]:px-2")}
        >
          <Pencil aria-hidden="true" className="h-4 w-4 shrink-0" />
          Editar
        </button>
        <button
          type="button"
          onClick={onStatus}
          aria-label={`${player.is_active ? "Desactivar" : "Activar"} a ${player.full_name}`}
          className={cn(
            teamSecondary,
            "min-w-12 gap-1 px-1 whitespace-nowrap min-[360px]:px-2",
            player.is_active ? "bg-slate-100" : "bg-emerald-50",
          )}
        >
          {player.is_active ? (
            <UserRoundMinus
              aria-hidden="true"
              className="hidden h-4 w-4 shrink-0 min-[360px]:block"
            />
          ) : (
            <UserRoundCheck
              aria-hidden="true"
              className="hidden h-4 w-4 shrink-0 min-[360px]:block"
            />
          )}
          <span>{player.is_active ? "Desactivar" : "Activar"}</span>
        </button>
      </div>
      {!player.is_active && (
        <p className="px-4 pb-3 text-sm font-bold">
          <UserRound aria-hidden="true" className="mr-1 inline h-4 w-4" />
          Jugador desactivado
        </p>
      )}
    </article>
  );
}
