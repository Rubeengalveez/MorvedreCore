import Link from "next/link";
import { notFound } from "next/navigation";
import type { Route } from "next";

import { AdminPageShell } from "@/components/admin/admin-page";
import { PageBackLink } from "@/components/ui/page-back-link";
import { CATEGORY_LABELS, safeInferCategory, type CategoryCode } from "@/lib/domain/categories";
import { canRosterPlayer } from "@/lib/domain/teams";
import { getAdminAccess } from "@/server/actions/admin/_helpers";
import { teamSeasonYear } from "@/lib/domain/team-presentation";
import { TeamHero } from "@/components/team/team-hero";
import { TeamDefaultCapsEditor } from "@/components/team/team-default-caps-editor";
import { TeamNav, TeamSection, teamSecondary } from "@/components/team/team-ui";
import { CATEGORY_COLORS } from "@/lib/domain/categories";
import { validCapNumber } from "@/lib/domain/cap-number";
import { createClient } from "@/lib/supabase/server";
import type { Team } from "@/server/actions/admin";

import { RosterAddSheet, RosterList, type RosterRow } from "./_components/roster-manager";
import { StaffAssignSheet, StaffList } from "./_components/staff-manager";
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
    { data: teamData, error: teamError },
    { data: staffData, error: staffError },
    { data: rosterData, error: rosterError },
    { data: allProfiles, error: profilesError },
    { data: categoryTeams, error: categoryTeamsError },
    { data: templateData, error: templateError },
  ] = await Promise.all([
    supabase
      .from("teams")
      .select(
        "id, season_id, category_code, label, gender, team_type, color, home_pool, notes, created_at, updated_at, seasons!teams_season_id_fkey(label,start_date)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("team_staff")
      .select("profile_id, role, profiles!team_staff_profile_id_fkey(full_name)")
      .eq("team_id", id),
    supabase
      .from("team_rosters")
      .select(
        "player_id, squad_number, profiles!team_rosters_player_id_fkey(full_name, birth_year)",
      )
      .eq("team_id", id)
      .is("left_at", null),
    supabase
      .from("profiles")
      .select("id, full_name, birth_year")
      .eq("is_active", true)
      .order("full_name", { ascending: true })
      .limit(500),
    supabase.from("teams").select("category_code,color,season_id").order("label"),
    supabase
      .from("team_callup_templates")
      .select("player_id,cap_number,profiles!team_callup_templates_player_id_fkey(full_name)")
      .eq("team_id", id),
  ]);

  if (
    teamError ||
    staffError ||
    rosterError ||
    profilesError ||
    categoryTeamsError ||
    templateError
  )
    throw new Error("No pudimos cargar el equipo. Vuelve a intentarlo.", {
      cause: teamError ?? staffError ?? rosterError ?? profilesError,
    });
  const joinedSeason = Array.isArray(teamData?.seasons) ? teamData.seasons[0] : teamData?.seasons;
  return {
    template: templateData ?? [],
    season: joinedSeason,
    categoryColors: Object.fromEntries(
      (categoryTeams ?? [])
        .filter((t) => t.season_id === teamData?.season_id)
        .map((t) => [t.category_code, t.color]),
    ),
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
    allProfiles: (allProfiles ?? []) as Array<{
      id: string;
      full_name: string;
      birth_year: number | null;
    }>,
  };
}

export default async function TeamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const [{ team, staff, roster, allProfiles, season, categoryColors, template }, access, filters] =
    await Promise.all([loadTeam(id), getAdminAccess(), searchParams]);
  const active = filters.tab === "personal" || filters.tab === "datos" ? filters.tab : "plantilla";
  const canManageStaff = Boolean(access.isAdmin || access.permissions.has("manage_staff"));

  if (!team) {
    notFound();
  }

  const staffRows: StaffRow[] = staff.map((s) => {
    const profRaw = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
    const fullName = (profRaw as { full_name?: string } | null)?.full_name ?? "Sin nombre";
    return { profile_id: s.profile_id, role: s.role, full_name: fullName };
  });

  if (!season) throw new Error("No pudimos cargar la temporada del equipo.");
  const year = teamSeasonYear(season.start_date);
  const rosterPlayerIds = new Set(roster.map((r) => r.player_id));
  const templateCaps = new Map(template.map((p) => [p.player_id, p.cap_number]));
  const rosterRows: RosterRow[] = roster
    .map((r) => {
      const profRaw = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
      const p = profRaw as { full_name?: string; birth_year?: number | null } | null;
      const birthYear = p?.birth_year ?? null;
      const category = birthYear == null ? null : safeInferCategory(birthYear, year);
      let categoryLabel = "—";
      if (birthYear != null) {
        try {
          const code = safeInferCategory(birthYear, year);
          categoryLabel = code ? CATEGORY_LABELS[code] : "Sin categoría";
        } catch {
          categoryLabel = "—";
        }
      }
      return {
        player_id: r.player_id,
        full_name: p?.full_name ?? "Sin nombre",
        birth_year: birthYear,
        squad_number:
          template.length > 0
            ? (templateCaps.get(r.player_id) ?? null)
            : validCapNumber(r.squad_number),
        categoryLabel,
        category,
        categoryColor: category
          ? (categoryColors[category] ?? CATEGORY_COLORS[category])
          : undefined,
      };
    })
    .sort((a, b) => {
      const aDorsal = a.squad_number ?? 999;
      const bDorsal = b.squad_number ?? 999;
      if (aDorsal !== bDorsal) return aDorsal - bDorsal;
      return a.full_name.localeCompare(b.full_name, "es");
    });

  const staffCandidates = allProfiles.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    category_code: null,
  }));

  const rosterCandidates = allProfiles
    .filter(
      (p) =>
        !rosterPlayerIds.has(p.id) &&
        p.birth_year != null &&
        p.birth_year <= year &&
        canRosterPlayer(p.birth_year, team.category_code, year),
    )
    .map((p) => ({
      id: p.id,
      full_name: p.full_name,
      birth_year: p.birth_year,
      category: p.birth_year == null ? null : safeInferCategory(p.birth_year, year),
      categoryColor:
        p.birth_year == null
          ? undefined
          : (categoryColors[safeInferCategory(p.birth_year, year)!] ??
            CATEGORY_COLORS[safeInferCategory(p.birth_year, year)!]),
      categoryLabel:
        p.birth_year != null
          ? CATEGORY_LABELS[safeInferCategory(p.birth_year, year)!]
          : "Sin categoría",
    }));

  const teamCategory = team.category_code as CategoryCode;
  const capPlayers = rosterRows.map((p) => ({
    player_id: p.player_id,
    full_name: p.full_name,
    cap_number: p.squad_number,
  }));
  for (const p of template) {
    if (rosterPlayerIds.has(p.player_id)) continue;
    const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    capPlayers.push({
      player_id: p.player_id,
      full_name: profile?.full_name ?? "Jugador de refuerzo",
      cap_number: p.cap_number,
    });
  }

  return (
    <AdminPageShell className="gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PageBackLink href="/admin/teams">Todos los equipos</PageBackLink>
        <Link
          href={`/team/${team.id}?from=admin&adminTab=${active}` as Route}
          className={`${teamSecondary} text-sm`}
        >
          Ver equipo
        </Link>
      </div>
      <TeamHero
        team={team}
        homePool={team.home_pool}
        playerCount={rosterRows.length}
        staff={staffRows}
      />
      <TeamNav
        label="Gestionar equipo"
        items={[
          { label: "Plantilla", href: "/admin/teams/" + team.id, active: active === "plantilla" },
          {
            label: "Personal",
            href: "/admin/teams/" + team.id + "?tab=personal",
            active: active === "personal",
          },
          {
            label: "Datos",
            href: "/admin/teams/" + team.id + "?tab=datos",
            active: active === "datos",
          },
        ]}
      />
      {active === "plantilla" ? (
        <TeamSection title="Plantilla">
          <TeamDefaultCapsEditor
            key={JSON.stringify(capPlayers)}
            teamId={team.id}
            players={capPlayers}
          />
          <RosterAddSheet
            teamId={team.id}
            candidates={rosterCandidates}
            usedCaps={rosterRows.map((r) => r.squad_number).filter((c): c is number => c != null)}
          />
          <RosterList teamId={team.id} rows={rosterRows} />
        </TeamSection>
      ) : null}
      {active === "personal" ? (
        <TeamSection title="Cuerpo técnico">
          {canManageStaff ? (
            <StaffAssignSheet teamId={team.id} candidates={staffCandidates} assigned={staffRows} />
          ) : null}
          <StaffList teamId={team.id} staff={staffRows} editable={canManageStaff} />
        </TeamSection>
      ) : null}
      {active === "datos" ? (
        <TeamSection title="Datos del equipo">
          <dl className="text-pool-deep space-y-3">
            <DetailRow label="Temporada">{season.label}</DetailRow>
            <DetailRow label="Categoría">{CATEGORY_LABELS[teamCategory]}</DetailRow>
            <DetailRow label="Modalidad">
              {team.team_type === "school" ? "Escuela" : "Competición"}
            </DetailRow>
            <DetailRow label="Piscina">{team.home_pool ?? "Sin asignar"}</DetailRow>
            <DetailRow label="Color">
              <span
                className="border-pool-deep inline-block h-6 w-6 rounded border"
                style={{ backgroundColor: team.color }}
                role="img"
                aria-label={team.color}
              />
            </DetailRow>
          </dl>
          <TeamEditSheet team={team} />
        </TeamSection>
      ) : null}
    </AdminPageShell>
  );
}
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-pool-deep/65 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 rounded-xl border-2 bg-blue-50 p-3">
      <dt className="font-semibold">{label}</dt>
      <dd className="font-bold [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}
