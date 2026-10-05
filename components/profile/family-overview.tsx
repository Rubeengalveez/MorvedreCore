import { CalendarCheck2, ClipboardCheck, ReceiptText, ShoppingBag, Timer } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import { ActionGroup, SettingsLink } from "./profile-hub";
import { formatTreasuryCents } from "@/lib/domain/treasury";
import type { FamilyOverview } from "@/server/queries/family";
export function FamilyOverviewPanel({
  family,
  pendingTreasuryCents,
}: {
  family: FamilyOverview;
  pendingTreasuryCents: number;
}) {
  if (!family.members.length) return null;
  return (
    <div className="space-y-3">
      {family.members.map((member) => (
        <article
          key={member.id}
          className="border-pool-deep/70 overflow-hidden rounded-2xl border-2 bg-white"
        >
          <div className="bg-pool-deep flex items-center gap-3 p-4 text-white">
            <Avatar
              name={member.full_name}
              src={member.photo_url}
              size={52}
              style={{ backgroundColor: "var(--pool-deep)" }}
              teamColor={member.team_color ?? member.teams[0]?.color ?? "var(--pool-blue)"}
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-extrabold">
                <AdaptivePlayerName name={member.full_name} />
              </h2>
              <p className="mt-1 text-sm font-semibold">
                {member.teams.map((team) => team.label).join(" · ") || "Sin equipo esta temporada"}
              </p>
            </div>
          </div>
          <nav aria-label={`Datos de ${member.display_name}`} className="space-y-2 p-2">
            {member.teams[0] && (
              <SettingsLink
                href={`/team/${member.teams[0].id}/players/${member.id}?from=family`}
                label="Ficha deportiva"
                icon={ClipboardCheck}
              />
            )}
            <SettingsLink
              href={`/attendance/history?player=${member.id}&from=family`}
              label="Asistencia"
              icon={CalendarCheck2}
            />
            <SettingsLink
              href={`/players/${member.id}/swim-times?from=family`}
              label="Tiempos de nado"
              icon={Timer}
            />
          </nav>
        </article>
      ))}
      <ActionGroup
        title="Gestiones familiares"
        links={[
          {
            href: "/shop/parents/pending?from=family",
            label: "Revisar pedidos",
            detail: family.pending_approval_count
              ? `${family.pending_approval_count} por autorizar`
              : "Sin pedidos por autorizar",
            icon: ShoppingBag,
          },
          {
            href: "/treasury?from=family",
            label: "Cuotas familiares",
            detail: pendingTreasuryCents
              ? `${formatTreasuryCents(pendingTreasuryCents)} pendientes`
              : "Todo al día",
            icon: ReceiptText,
          },
        ]}
      />
    </div>
  );
}
