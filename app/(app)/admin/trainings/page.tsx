import { MdAdd } from "react-icons/md";
import Link from "next/link";
import type { Route } from "next";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type { Season, Team, TrainingBlockRow, TrainingSessionRow } from "@/server/actions/admin";

import { TrainingsList } from "./_components/trainings-list";
import { TrainingBlockFormSheet } from "./_components/training-block-form-sheet";
import type { AttendancePlayer } from "./_components/attendance-sheet";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Entrenamientos — Admin — Morvedre Core",
};

type SeasonRow = Season;
type TeamRow = Team & { season_label: string };

type AttendanceBySession = Record<
  string,
  Record<string, { present: boolean; reason: string | null }>
>;

type LoadResult =
  | {
      ok: true;
      seasons: SeasonRow[];
      teams: TeamRow[];
      currentSeasonId: string | null;
      defaultTeamId: string | null;
      blocks: TrainingBlockRow[];
      sessionsByBlock: Record<string, TrainingSessionRow[]>;
      rosterByTeam: Record<string, AttendancePlayer[]>;
      attendanceBySession: AttendanceBySession;
      error: null;
    }
  | {
      ok: false;
      seasons: SeasonRow[];
      teams: TeamRow[];
      currentSeasonId: string | null;
      defaultTeamId: null;
      blocks: TrainingBlockRow[];
      sessionsByBlock: Record<string, TrainingSessionRow[]>;
      rosterByTeam: Record<string, AttendancePlayer[]>;
      attendanceBySession: AttendanceBySession;
      error: string;
    };

const NEXT_FOUR_WEEKS_MS = 4 * 7 * 24 * 60 * 60 * 1000;

async function loadTrainings(): Promise<LoadResult> {
  const supabase = await createClient();

  const [
    { data: seasonsData, error: seasonsError },
    { data: teamsData, error: teamsError },
    { data: blocksData, error: blocksError },
  ] = await Promise.all([
    supabase
      .from("seasons")
      .select("id, label, start_date, end_date, is_current, archived_at, created_at, updated_at")
      .order("start_date", { ascending: false }),
    supabase
      .from("teams")
      .select(
        "id, season_id, category_code, label, gender, team_type, color, home_pool, notes, created_at, updated_at",
      ),
    supabase
      .from("training_blocks")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
  ]);

  const firstError = seasonsError ?? teamsError ?? blocksError;
  const seasons = (seasonsData ?? []) as SeasonRow[];
  const currentSeason = seasons.find((s) => s.is_current) ?? null;

  const teamsAll = (teamsData ?? []) as Array<Team & { created_at: string; updated_at: string }>;
  const teams: TeamRow[] = teamsAll.map((t) => ({
    ...t,
    season_label: seasons.find((s) => s.id === t.season_id)?.label ?? "Sin temporada",
  }));

  const defaultTeamId =
    currentSeason != null
      ? (teams.find((t) => t.season_id === currentSeason.id)?.id ?? null)
      : null;

  const blocks = (blocksData ?? []) as TrainingBlockRow[];

  if (firstError) {
    return {
      ok: false,
      seasons,
      teams,
      currentSeasonId: null,
      defaultTeamId: null,
      blocks: [],
      sessionsByBlock: {},
      rosterByTeam: {},
      attendanceBySession: {},
      error: firstError.message,
    };
  }

  if (blocks.length === 0) {
    return {
      ok: true,
      seasons,
      teams,
      currentSeasonId: currentSeason?.id ?? null,
      defaultTeamId,
      blocks: [],
      sessionsByBlock: {},
      rosterByTeam: {},
      attendanceBySession: {},
      error: null,
    };
  }

  const blockIds = blocks.map((b) => b.id);
  const teamIds = Array.from(new Set(blocks.map((b) => b.team_id)));

  const now = new Date();
  const nowIso = now.toISOString();
  const horizonIso = new Date(now.getTime() + NEXT_FOUR_WEEKS_MS).toISOString();

  const [
    { data: sessionsData, error: sessionsError },
    { data: rosterData, error: rosterError },
    { data: profilesData, error: profilesError },
    { data: attendanceData, error: attendanceError },
  ] = await Promise.all([
    supabase
      .from("training_sessions")
      .select("*")
      .in("block_id", blockIds)
      .gte("scheduled_at", nowIso)
      .lte("scheduled_at", horizonIso)
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("team_rosters")
      .select("team_id, player_id, squad_number")
      .in("team_id", teamIds)
      .is("left_at", null),
    supabase
      .from("profiles")
      .select("id, full_name, photo_url, cap_number")
      .order("full_name", { ascending: true })
      .limit(1000),
    supabase.from("training_attendance").select("session_id, player_id, present, reason"),
  ]);

  const loadError = sessionsError ?? rosterError ?? profilesError ?? attendanceError;
  if (loadError) {
    return {
      ok: false,
      seasons,
      teams,
      currentSeasonId: null,
      defaultTeamId: null,
      blocks: [],
      sessionsByBlock: {},
      rosterByTeam: {},
      attendanceBySession: {},
      error: loadError.message,
    };
  }

  const profileById = new Map<
    string,
    { id: string; full_name: string; photo_url: string | null; cap_number: number | null }
  >();
  for (const p of profilesData ?? []) {
    profileById.set(p.id, {
      id: p.id,
      full_name: p.full_name,
      photo_url: p.photo_url,
      cap_number: p.cap_number,
    });
  }

  const rosterByTeam: Record<string, AttendancePlayer[]> = {};
  for (const r of rosterData ?? []) {
    const profile = profileById.get(r.player_id);
    if (!profile) continue;
    const list = rosterByTeam[r.team_id] ?? [];
    list.push({
      id: profile.id,
      full_name: profile.full_name,
      photo_url: profile.photo_url,
      cap_number: r.squad_number ?? profile.cap_number,
      present: true,
      reason: null,
    });
    rosterByTeam[r.team_id] = list;
  }
  for (const list of Object.values(rosterByTeam)) {
    list.sort((a, b) => {
      const aCap = a.cap_number ?? 999;
      const bCap = b.cap_number ?? 999;
      if (aCap !== bCap) return aCap - bCap;
      return a.full_name.localeCompare(b.full_name, "es");
    });
  }

  const sessionsByBlock: Record<string, TrainingSessionRow[]> = {};
  const sessionIds: string[] = [];
  for (const s of (sessionsData ?? []) as TrainingSessionRow[]) {
    if (!s.block_id) continue;
    const list = sessionsByBlock[s.block_id] ?? [];
    list.push(s);
    sessionsByBlock[s.block_id] = list;
    sessionIds.push(s.id);
  }

  const attendanceBySession: AttendanceBySession = {};
  const validSessionIds = new Set(sessionIds);
  for (const row of (attendanceData ?? []) as Array<{
    session_id: string;
    player_id: string;
    present: boolean;
    reason: string | null;
  }>) {
    if (!validSessionIds.has(row.session_id)) continue;
    const byPlayer =
      attendanceBySession[row.session_id] ??
      ({} as Record<string, { present: boolean; reason: string | null }>);
    byPlayer[row.player_id] = { present: row.present, reason: row.reason };
    attendanceBySession[row.session_id] = byPlayer;
  }

  return {
    ok: true,
    seasons,
    teams,
    currentSeasonId: currentSeason?.id ?? null,
    defaultTeamId,
    blocks,
    sessionsByBlock,
    rosterByTeam,
    attendanceBySession,
    error: null,
  };
}

export default async function TrainingsPage() {
  const {
    seasons,
    teams,
    currentSeasonId,
    defaultTeamId,
    blocks,
    sessionsByBlock,
    rosterByTeam,
    attendanceBySession,
    error,
  } = await loadTrainings();

  if (seasons.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4">
        <h1 className="font-display text-brand-deep text-2xl font-extrabold tracking-tight">
          Entrenamientos
        </h1>
        <div className="border-ink-300 bg-paper rounded-md border border-dashed p-5 text-center">
          <p className="text-brand-deep text-base font-semibold">Primero crea una temporada.</p>
          <p className="text-ink-600 mt-1 text-sm">
            Los bloques de entrenamientos pertenecen a un equipo de una temporada.
          </p>
          <div className="mt-4 flex justify-center">
            <Button asChild size="md">
              <Link href={"/admin/seasons" as Route}>Ir a Temporadas</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4">
        <h1 className="font-display text-brand-deep text-2xl font-extrabold tracking-tight">
          Entrenamientos
        </h1>
        <div className="border-ink-300 bg-paper rounded-md border border-dashed p-5 text-center">
          <p className="text-brand-deep text-base font-semibold">Primero crea un equipo.</p>
          <p className="text-ink-600 mt-1 text-sm">
            Los bloques de entrenamientos se asignan a un equipo.
          </p>
          <div className="mt-4 flex justify-center">
            <Button asChild size="md">
              <Link href={"/admin/teams" as Route}>Ir a Equipos</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-brand-deep text-2xl font-extrabold tracking-tight">
            Entrenamientos
          </h1>
          <p className="text-ink-600 text-sm">
            Bloques de entrenamiento, sesiones y lista de asistencia.
          </p>
        </div>
        {blocks.length > 0 ? (
          <TrainingBlockFormSheet
            seasons={seasons}
            teams={teams}
            defaultTeamId={defaultTeamId}
            defaultSeasonId={currentSeasonId}
            trigger={
              <Button size="md" className="w-full shrink-0 justify-center sm:w-auto">
                <MdAdd className="h-6 w-6" aria-hidden="true" />
                <span>Nuevo bloque</span>
              </Button>
            }
          />
        ) : null}
      </header>

      {error ? (
        <Alert variant="danger" title="No pudimos cargar los entrenamientos">
          {error}
        </Alert>
      ) : null}

      <TrainingsList
        seasons={seasons}
        teams={teams}
        currentSeasonId={currentSeasonId}
        defaultTeamId={defaultTeamId}
        blocks={blocks}
        sessionsByBlock={sessionsByBlock}
        rosterByTeam={rosterByTeam}
        attendanceBySession={attendanceBySession}
      />
    </div>
  );
}
