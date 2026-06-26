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
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getCurrentSeason } from "@/server/queries/seasons";
import {
  isProfilePlayerInSeason,
  isProfileStaffInSeason,
} from "@/server/queries/teams";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Inicio — Morvedre Core",
  description: "Tu partido, tu equipo, tu actividad.",
};

export default async function DashboardPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");

  const { activeProfile } = ctx;
  const firstName = activeProfile.full_name.split(" ")[0] ?? activeProfile.full_name;

  const season = await getCurrentSeason();
  const inSeason = season != null;
  const [isPlayer, isCoach] = inSeason
    ? await Promise.all([
        isProfilePlayerInSeason(activeProfile.id, season.id),
        isProfileStaffInSeason(activeProfile.id, season.id),
      ])
    : [false, false];

  const showPlayerStats = isPlayer;
  const showCoachView = !isPlayer && isCoach;

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
        <ActionCard
          accentColor={showCoachView ? "var(--brand-aqua)" : "var(--brand-blue)"}
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
          />
        </div>
      </div>
    </div>
  );
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
