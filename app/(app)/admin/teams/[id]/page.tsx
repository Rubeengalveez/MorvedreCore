import Link from "next/link";
import { notFound } from "next/navigation";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, inferCategory, type CategoryCode } from "@/lib/domain/categories";
import { createClient } from "@/lib/supabase/server";
import type { Team } from "@/server/actions/admin";

import { RosterAddSheet, RosterList, type RosterRow } from "./_components/roster-manager";
import {
  StaffAssignSheet,
  StaffList,
} from "./_components/staff-manager";
import { TeamEditSheet } from "./_components/team-edit-sheet";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type StaffRole = "head_coach" | "assistant_coach" | "delegate" | "physical_trainer";

type StaffRow = {
  profile_id: string;
  role: StaffRole;
  full_name: string;
};

async function loadTeam(id: string) {
  const supabase = await createClient();

  const [
    { data: teamData },
    { data: staffData },
    { data: rosterData },
    { data: allStaffProfiles },
    { data: candidatePlayers },
  ] = await Promise.all([
    supabase
      .from("teams")
      .select("id, season_id, category_code, label, gender, team_type, color, home_pool, notes, created_at, updated_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("team_staff")
      .select("profile_id, role, profiles!team_staff_profile_id_fkey(full_name)")
      .eq("team_id", id),
    supabase
      .from("team_rosters")
      .select("player_id, squad_number, profiles!team_rosters_player_id_fkey(full_name, birth_year)")
      .eq("team_id", id)
      .is("left_at", null),
    supabase
      .from("profiles")
      .select("id, full_name, birth_year")
      .order("full_name", { ascending: true })
      .limit(500),
    supabase
      .from("profiles")
      .select("id, full_name, birth_year")
      .order("full_name", { ascending: true })
      .limit(500),
  ]);

  return {
    team: (teamData ?? null) as Team | null,
    staff: (staffData ?? []) as Array<{
      profile_id: string;
      role: StaffRole;
      profiles: unknown;
    }>,
    roster: (rosterData ?? []) as Array<{
      player_id: string;
      squad_number: number | null;
      profiles: unknown;
    }>,
    allProfiles: (allStaffProfiles ?? []) as Array<{
      id: string;
      full_name: string;
      birth_year: number | null;
    }>,
    candidatePlayers: (candidatePlayers ?? []) as Array<{
      id: string;
      full_name: string;
      birth_year: number | null;
    }>,
  };
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { team, staff, roster, allProfiles, candidatePlayers } = await loadTeam(id);

  if (!team) {
    notFound();
  }

  const staffRows: StaffRow[] = staff.map((s) => {
    const profRaw = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
    const fullName = (profRaw as { full_name?: string } | null)?.full_name ?? "Sin nombre";
    return { profile_id: s.profile_id, role: s.role, full_name: fullName };
  });

  const rosterPlayerIds = new Set(roster.map((r) => r.player_id));
  const rosterRows: RosterRow[] = roster
    .map((r) => {
      const profRaw = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      const p = profRaw as { full_name?: string; birth_year?: number | null } | null;
      const birthYear = p?.birth_year ?? null;
      let categoryLabel = "—";
      if (birthYear != null) {
        try {
          const currentYear = new Date().getFullYear();
          const code = inferCategory(birthYear, currentYear);
          categoryLabel = CATEGORY_LABELS[code];
        } catch {
          categoryLabel = "—";
        }
      }
      return {
        player_id: r.player_id,
        full_name: p?.full_name ?? "Sin nombre",
        birth_year: birthYear,
        squad_number: r.squad_number,
        categoryLabel,
      };
    })
    .sort((a, b) => {
      const aDorsal = a.squad_number ?? 999;
      const bDorsal = b.squad_number ?? 999;
      if (aDorsal !== bDorsal) return aDorsal - bDorsal;
      return a.full_name.localeCompare(b.full_name, "es");
    });

  const staffCandidateSet = new Set(staff.map((s) => s.profile_id));
  const staffCandidates = allProfiles
    .filter((p) => !staffCandidateSet.has(p.id))
    .map((p) => ({
      id: p.id,
      full_name: p.full_name,
      category_code: null,
    }));

  const rosterCandidates = candidatePlayers
    .filter((p) => !rosterPlayerIds.has(p.id))
    .map((p) => ({
      id: p.id,
      full_name: p.full_name,
      birth_year: p.birth_year,
    }));

  const teamCategory = team.category_code as CategoryCode;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm text-ink-600">
          <Link
            href={"/admin/teams" as Route}
            className="font-semibold text-brand-blue hover:underline focus-visible:underline"
          >
            ← Equipos
          </Link>
        </div>
        <div
          className="overflow-hidden rounded-md border border-ink-300 bg-paper"
        >
          <div
            aria-hidden="true"
            className="h-2 w-full"
            style={{ backgroundColor: team.color }}
          />
          <div className="flex flex-col gap-2 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-brand-deep">
                {team.label}
              </h1>
              <span className="rounded-full border border-ink-300 px-2 py-0.5 text-xs font-semibold text-ink-600">
                {CATEGORY_LABELS[teamCategory]}
              </span>
              {team.team_type === "school" ? (
                <span className="rounded-full border border-ink-300 px-2 py-0.5 text-xs font-semibold text-ink-600">
                  Escuela
                </span>
              ) : null}
            </div>
            {team.home_pool ? (
              <p className="text-sm text-ink-600">Piscina: {team.home_pool}</p>
            ) : null}
          </div>
        </div>
      </header>

      <section
        aria-labelledby="staff-heading"
        className="flex flex-col gap-3"
      >
        <div className="flex items-center justify-between gap-2">
          <h2
            id="staff-heading"
            className="font-display text-lg font-bold text-brand-deep"
          >
            Personal
          </h2>
          <StaffAssignSheet
            teamId={team.id}
            candidates={staffCandidates}
            trigger={
              <Button size="sm">Añadir</Button>
            }
          />
        </div>
        <StaffList teamId={team.id} staff={staffRows} />
      </section>

      <section
        aria-labelledby="roster-heading"
        className="flex flex-col gap-3"
      >
        <div className="flex items-center justify-between gap-2">
          <h2
            id="roster-heading"
            className="font-display text-lg font-bold text-brand-deep"
          >
            Plantilla
          </h2>
          <RosterAddSheet
            teamId={team.id}
            candidates={rosterCandidates}
            trigger={
              <Button size="sm">Añadir jugador</Button>
            }
          />
        </div>
          <RosterList teamId={team.id} rows={rosterRows} />
      </section>

      <section
        aria-labelledby="details-heading"
        className="flex flex-col gap-3"
      >
        <div className="flex items-center justify-between gap-2">
          <h2
            id="details-heading"
            className="font-display text-lg font-bold text-brand-deep"
          >
            Detalles
          </h2>
          <TeamEditSheet
            team={team}
            trigger={
              <Button size="sm" variant="secondary">
                Editar
              </Button>
            }
          />
        </div>
        <dl className="rounded-md border border-ink-300 bg-paper p-4 text-sm">
          <DetailRow label="Color">
            <span
              aria-hidden="true"
              className="inline-block h-4 w-4 rounded-full border border-ink-300 align-middle"
              style={{ backgroundColor: team.color }}
            />
            <span className="ml-2 font-mono text-xs text-ink-600">{team.color}</span>
          </DetailRow>
          <DetailRow label="Género">{team.gender}</DetailRow>
          <DetailRow label="Tipo">{team.team_type}</DetailRow>
          <DetailRow label="Piscina">{team.home_pool ?? "—"}</DetailRow>
          <DetailRow label="Notas">{team.notes ?? "—"}</DetailRow>
        </dl>
      </section>

      <div className="flex justify-end">
        <Button asChild variant="secondary" size="md">
          <Link href={"/admin/teams" as Route} className="text-brand-blue">
            Volver al listado
          </Link>
        </Button>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink-300 py-2 last:border-b-0">
      <dt className="font-semibold text-ink-600">{label}</dt>
      <dd className="text-right text-ink-900">{children}</dd>
    </div>
  );
}
