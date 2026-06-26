import type { Route } from "next";
import { redirect } from "next/navigation";

import {
  Balon,
  Gorro,
  Ola,
  SilbatoActivo,
  Usuario,
} from "@/components/brand/pictograms";
import { ActionCard } from "@/components/ui/action-card";
import { PictogramTile } from "@/components/ui/pictogram-tile";
import { WaterDivider } from "@/components/ui/water-divider";
import { formatLongDate, formatTimeOfDay } from "@/lib/domain/calendar";
import { createClient } from "@/lib/supabase/server";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getNextEventForProfile } from "@/server/queries/calendar";
import { getCurrentSeason } from "@/server/queries/seasons";
import {
  getTeamsForProfileInSeason,
  isProfilePlayerInSeason,
  isProfileStaffInSeason,
} from "@/server/queries/teams";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Inicio — Morvedre Core",
  description: "Tu partido, tu equipo, tu actividad.",
};

interface NextEventView {
  kind: "training" | "match";
  id: string;
  scheduled_at: string;
  cancelled: boolean;
  team_label: string;
  team_color: string;
  opponent: string | null;
  location: string | null;
  pool_name: string | null;
  href: string;
  cancellation_reason: string | null;
}

function extractJoined<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

async function loadNextEvent(
  profileId: string,
  teamIds: string[],
): Promise<NextEventView | null> {
  if (teamIds.length === 0) return null;
  const next = await getNextEventForProfile({
    teamIds,
    profileId,
  });
  if (!next) return null;

  const supabase = await createClient();
  if (next.kind === "training") {
    const { data } = await supabase
      .from("training_sessions")
      .select(
        "id, scheduled_at, cancelled, cancellation_reason, location, teams!training_sessions_team_id_fkey(label, color)",
      )
      .eq("id", next.id)
      .maybeSingle();
    if (!data) return null;
    const team = extractJoined(
      (data as { teams: unknown }).teams,
    ) as { label?: string; color?: string } | null;
    return {
      kind: "training",
      id: (data as { id: string }).id,
      scheduled_at: (data as { scheduled_at: string }).scheduled_at,
      cancelled: (data as { cancelled: boolean }).cancelled,
      cancellation_reason: (data as { cancellation_reason: string | null }).cancellation_reason,
      team_label: team?.label ?? "tu equipo",
      team_color: team?.color ?? "var(--brand-blue)",
      opponent: null,
      location: (data as { location: string | null }).location,
      pool_name: null,
      href: "/calendar",
    };
  }

  const { data } = await supabase
    .from("matches")
    .select(
      "id, scheduled_at, status, opponent, location, pool_name, teams!matches_team_id_fkey(label, color)",
    )
    .eq("id", next.id)
    .maybeSingle();
  if (!data) return null;
  const team = extractJoined(
    (data as { teams: unknown }).teams,
  ) as { label?: string; color?: string } | null;
  const status = (data as { status: string }).status;
  return {
    kind: "match",
    id: (data as { id: string }).id,
    scheduled_at: (data as { scheduled_at: string }).scheduled_at,
    cancelled: status === "cancelled",
    cancellation_reason: null,
    team_label: team?.label ?? "tu equipo",
    team_color: team?.color ?? "var(--brand-action)",
    opponent: (data as { opponent: string }).opponent,
    location: (data as { location: string | null }).location,
    pool_name: (data as { pool_name: string | null }).pool_name,
    href: `/matches/${(data as { id: string }).id}` as Route,
  };
}

export default async function DashboardPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");

  const { activeProfile } = ctx;
  const firstName = activeProfile.full_name.split(" ")[0] ?? activeProfile.full_name;

  const season = await getCurrentSeason();
  const inSeason = season != null;
  const [isPlayer, isCoach] = inSeason
    ? await Promise.all([
        isProfilePlayerInSeason(activeProfile.id, season!.id),
        isProfileStaffInSeason(activeProfile.id, season!.id),
      ])
    : [false, false];

  const showPlayerStats = isPlayer;
  const showCoachView = !isPlayer && isCoach;

  const teams = inSeason
    ? await getTeamsForProfileInSeason(activeProfile.id, season!.id)
    : [];
  const teamIds = teams.map((t) => t.id);
  const nextEvent = await loadNextEvent(activeProfile.id, teamIds);

  return (
    <div className="flex w-full flex-col">
      <div className="mx-auto w-full max-w-2xl px-4 pb-3 pt-4">
        <h1 className="font-display text-[28px] font-extrabold leading-[1.1] tracking-tight text-brand-deep">
          Hola, {firstName}
        </h1>
        {showCoachView ? (
          <p className="mt-1 text-sm leading-relaxed text-ink-600">
            Tienes a tu cargo los equipos que verás en &ldquo;Tu equipo&rdquo;.
            Pasa por allí para ver la plantilla y el cuerpo técnico.
          </p>
        ) : null}
      </div>

      <WaterDivider fill="var(--brand-foam)" height={24} />

      <div className="mx-auto w-full max-w-2xl px-4 py-4">
        {nextEvent ? (
          <ActionCard
            accentColor={
              nextEvent.cancelled ? "var(--danger)" : nextEvent.team_color
            }
            pictogram={
              <Ola
                className="h-[50px] w-[50px]"
                accent={
                  nextEvent.cancelled
                    ? "var(--danger)"
                    : "var(--brand-action)"
                }
              />
            }
            title={
              nextEvent.cancelled
                ? "Evento cancelado"
                : nextEventTitle(nextEvent)
            }
            subtitle={nextEventSubtitle(nextEvent)}
            meta={
              nextEvent.cancelled && nextEvent.cancellation_reason
                ? `Motivo: ${nextEvent.cancellation_reason}`
                : nextEventLocation(nextEvent)
            }
            cta={{
              label:
                nextEvent.kind === "match" ? "Ver partido" : "Ir al calendario",
              href: nextEvent.href,
            }}
          />
        ) : (
          <ActionCard
            accentColor={
              showCoachView ? "var(--brand-aqua)" : "var(--brand-blue)"
            }
            pictogram={
              <Ola
                className="h-[50px] w-[50px]"
                accent="var(--brand-action)"
              />
            }
            title={
              showCoachView
                ? "Tu próximo partido con el equipo"
                : "Tu primer partido está al caer"
            }
            subtitle={
              showCoachView
                ? "Cuando convoques a tus jugadores, aparecerá aquí."
                : "Vitaliy está preparando la convocatoria."
            }
            meta="Las convocatorias se activan en la siguiente fase."
            cta={{ label: "Ir al calendario", href: "/calendar" as Route }}
          />
        )}
      </div>

      <WaterDivider fill="var(--brand-foam)" height={24} variant="footer" />

      <div className="mx-auto w-full max-w-2xl px-4 py-4">
        <div className="grid grid-cols-3 divide-x divide-ink-300 overflow-hidden rounded-md border border-ink-300 bg-paper">
          <Stat
            pictogram={
              <Balon className="h-6 w-6" accent="var(--brand-ball)" />
            }
            value={showPlayerStats ? "0" : "—"}
            label="Goles esta temporada"
          />
          <Stat
            pictogram={
              <Gorro className="h-6 w-6" accent="var(--brand-blue)" />
            }
            value="—"
            label="% Asistencia"
          />
          <Stat
            pictogram={<Usuario className="h-6 w-6" />}
            value={
              showPlayerStats && activeProfile.cap_number != null
                ? `#${activeProfile.cap_number}`
                : "—"
            }
            label="Tu dorsal"
          />
        </div>
      </div>

      <WaterDivider fill="var(--brand-foam)" height={24} />

      <div className="mx-auto w-full max-w-2xl px-4 pb-8 pt-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PictogramTile
            icon={
              <SilbatoActivo
                className="h-9 w-9"
                accent="var(--brand-aqua)"
              />
            }
            title={showCoachView ? "Tus equipos" : "Tu equipo"}
            description={
              showCoachView
                ? "Plantilla, cuerpo técnico y convocatorias"
                : "Plantilla, cuerpo técnico y próximos partidos"
            }
            href="/team"
          />
          <PictogramTile
            icon={
              <Ola className="h-9 w-9" accent="var(--brand-aqua)" />
            }
            title="Tu actividad"
            description="Tus próximos eventos y resultados"
            href="/calendar"
          />
        </div>
      </div>
    </div>
  );
}

function nextEventTitle(e: NextEventView): string {
  if (e.kind === "match") {
    return e.opponent
      ? `Tu próximo partido: vs ${e.opponent}`
      : "Tu próximo partido";
  }
  return `Tu próximo entreno con ${e.team_label}`;
}

function nextEventSubtitle(e: NextEventView): string {
  if (e.cancelled) return "Tu entrenador lo ha cancelado.";
  const day = formatLongDate(e.scheduled_at);
  const time = formatTimeOfDay(e.scheduled_at);
  return `${day} · ${time}`;
}

function nextEventLocation(e: NextEventView): string {
  if (e.cancelled) return "Confirma con tu entrenador si hay alternativa.";
  if (e.kind === "match") {
    if (e.pool_name && e.location) return `${e.location} · ${e.pool_name}`;
    return e.pool_name ?? e.location ?? "";
  }
  return e.location ?? "";
}

function Stat({
  pictogram,
  value,
  label,
}: {
  pictogram: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-2 py-4 text-center">
      <div className="shrink-0">{pictogram}</div>
      <span className="font-mono text-[28px] font-bold leading-none text-brand-deep">
        {value}
      </span>
      <span className="text-xs font-medium text-ink-600">{label}</span>
    </div>
  );
}
