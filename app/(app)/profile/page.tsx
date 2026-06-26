import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_LABELS,
  inferCategory,
  type CategoryCode,
} from "@/lib/domain/categories";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/server/actions/auth";
import { getCurrentSeason } from "@/server/queries/seasons";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Tu perfil — Morvedre Core",
  description: "Tu información personal y de contacto.",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  coach: "Entrenador",
  delegate: "Delegado",
  directiva: "Directiva",
  parent: "Tutor",
  player: "Jugador",
};

const ROLE_PRIORITY: Record<string, number> = {
  admin: 0,
  directiva: 1,
  coach: 2,
  delegate: 3,
  player: 4,
  parent: 5,
};

function extractYear(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function extractJoined<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value;
}

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, photo_url, birth_year, cap_number, license_active, phone_e164, email_contact, team_color",
    )
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");

  const season = await getCurrentSeason();

  const [{ data: rolesRaw }, { data: rosterRows }] = await Promise.all([
    supabase.from("user_roles").select("role").eq("profile_id", profile.id),
    season
      ? supabase
          .from("team_rosters")
          .select(
            "team_id, teams!team_rosters_team_id_fkey(id, label, category_code, color)",
          )
          .eq("player_id", profile.id)
          .is("left_at", null)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const roles = (rolesRaw ?? [])
    .map((r) => (r as { role: string }).role)
    .filter((r) => r in ROLE_LABELS)
    .sort((a, b) => (ROLE_PRIORITY[a] ?? 99) - (ROLE_PRIORITY[b] ?? 99));

  const primaryRole = roles[0] ?? null;

  const birthYear = extractYear(profile.birth_year);
  const currentYear = season ? Number(season.start_date.slice(0, 4)) : new Date().getFullYear();
  let categoryLabel: string | null = null;
  if (birthYear != null) {
    try {
      const code: CategoryCode = inferCategory(birthYear, currentYear);
      categoryLabel = CATEGORY_LABELS[code];
    } catch {
      categoryLabel = null;
    }
  }

  const teamNames: string[] = [];
  for (const row of rosterRows ?? []) {
    const team = extractJoined(
      (row as { teams: unknown }).teams,
    ) as { label?: string } | null;
    if (team?.label) teamNames.push(team.label);
  }
  teamNames.sort((a, b) => a.localeCompare(b, "es"));

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4">
      <header className="flex items-center gap-4">
        <Avatar
          name={profile.full_name}
          src={profile.photo_url}
          size={88}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-brand-deep">
            {profile.full_name}
          </h1>
          <div className="flex flex-wrap gap-1.5">
            {primaryRole ? (
              <span className="inline-flex h-6 items-center rounded-full bg-brand-blue px-2.5 text-[11px] font-semibold uppercase tracking-wider text-paper">
                {ROLE_LABELS[primaryRole]}
              </span>
            ) : null}
            {roles.length > 1
              ? roles.slice(1).map((r) => (
                  <span
                    key={r}
                    className="inline-flex h-6 items-center rounded-full border border-ink-300 bg-paper px-2.5 text-[11px] font-semibold uppercase tracking-wider text-ink-600"
                  >
                    {ROLE_LABELS[r]}
                  </span>
                ))
              : null}
          </div>
        </div>
      </header>

      <section
        aria-labelledby="profile-stats-heading"
        className="rounded-md border border-ink-300 bg-paper p-4"
      >
        <h2 id="profile-stats-heading" className="sr-only">
          Datos del perfil
        </h2>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat
            label="Dorsal"
            value={profile.cap_number != null ? `#${profile.cap_number}` : "—"}
          />
          <Stat
            label="Licencia"
            value={profile.license_active ? "Activa" : "Inactiva"}
            valueTone={profile.license_active ? "positive" : "muted"}
          />
          <Stat
            label="Categoría"
            value={categoryLabel ?? "—"}
          />
          <Stat
            label="Equipo"
            value={teamNames[0] ?? "—"}
            hint={teamNames.length > 1 ? `+${teamNames.length - 1} más` : undefined}
          />
        </dl>
      </section>

      <div className="flex flex-col gap-2">
        <Button asChild size="lg" className="w-full">
          <Link href={"/profile/edit" as Route}>Editar perfil</Link>
        </Button>
        <Link
          href={"/change-password" as Route}
          className="rounded text-center text-sm font-semibold text-brand-blue hover:underline focus-visible:underline focus-visible:outline-none"
        >
          Cambiar contraseña
        </Link>
      </div>

      <form action={signOut} className="pt-2">
        <Button type="submit" variant="secondary" size="md" className="w-full">
          Cerrar sesión
        </Button>
      </form>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  valueTone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  valueTone?: "default" | "positive" | "muted";
}) {
  const valueClass =
    valueTone === "positive"
      ? "text-success"
      : valueTone === "muted"
        ? "text-ink-600"
        : "text-brand-deep";
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-600">
        {label}
      </dt>
      <dd
        className={`font-display text-base font-extrabold leading-tight ${valueClass}`}
      >
        {value}
      </dd>
      {hint ? <dd className="text-xs text-ink-600">{hint}</dd> : null}
    </div>
  );
}
