import { createClient } from "@/lib/supabase/server";

import {
  StaffClient,
} from "./_components/staff-client";
import type {
  PersonOption,
  StaffRow,
  TeamOption,
} from "./_components/staff-manager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Personal — Admin — Morvedre Core",
};

type StaffQueryRow = {
  team_id: string;
  profile_id: string;
  role: "head_coach" | "assistant_coach" | "delegate" | "physical_trainer";
  team: unknown;
  profile: unknown;
};

async function loadData(): Promise<{
  rows: StaffRow[];
  teams: TeamOption[];
  people: PersonOption[];
}> {
  const supabase = await createClient();

  const [
    { data: staffData },
    { data: teamsData },
    { data: profilesData },
  ] = await Promise.all([
    supabase
      .from("team_staff")
      .select(
        "team_id, profile_id, role, team:teams!team_staff_team_id_fkey(id, label, season:seasons!teams_season_id_fkey(label)), profile:profiles!team_staff_profile_id_fkey(id, full_name)",
      ),
    supabase
      .from("teams")
      .select("id, label, season:seasons!teams_season_id_fkey(label)")
      .order("label", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name")
      .order("full_name", { ascending: true })
      .limit(2000),
  ]);

  const rows: StaffRow[] = ((staffData ?? []) as StaffQueryRow[]).map((r) => {
    const teamRaw = Array.isArray(r.team) ? r.team[0] : r.team;
    const team = teamRaw as { id?: string; label?: string; season?: unknown } | null;
    const seasonRaw = team?.season;
    const season = (Array.isArray(seasonRaw) ? seasonRaw[0] : seasonRaw) as
      | { label?: string }
      | null;
    const profileRaw = Array.isArray(r.profile) ? r.profile[0] : r.profile;
    const profile = profileRaw as { full_name?: string } | null;
    return {
      team_id: r.team_id,
      team_label: team?.label ?? "Sin nombre",
      season_label: season?.label ?? "—",
      profile_id: r.profile_id,
      profile_name: profile?.full_name ?? "Sin nombre",
      role: r.role,
    };
  });

  const teams: TeamOption[] = ((teamsData ?? []) as Array<{
    id: string;
    label: string;
    season: unknown;
  }>).map((t) => {
    const sRaw = Array.isArray(t.season) ? t.season[0] : t.season;
    const s = sRaw as { label?: string } | null;
    return {
      id: t.id,
      label: t.label,
      season_label: s?.label ?? "—",
    };
  });

  const people: PersonOption[] = ((profilesData ?? []) as PersonOption[]);

  return { rows, teams, people };
}

export default async function StaffPage() {
  const { rows, teams, people } = await loadData();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <StaffClient rows={rows} teams={teams} people={people} />
    </div>
  );
}
