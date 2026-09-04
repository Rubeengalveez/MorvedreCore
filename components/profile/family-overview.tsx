import Link from "next/link";
import type { Route } from "next";
import { CalendarCheck2, ChevronRight, ReceiptText, ShoppingBag, UsersRound } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { formatTreasuryCents } from "@/lib/domain/treasury";
import type { FamilyMemberOverview, FamilyOverview } from "@/server/queries/family";

export function FamilyOverviewPanel({
  family,
  pendingTreasuryCents,
}: {
  family: FamilyOverview;
  pendingTreasuryCents: number;
}) {
  if (family.members.length === 0) return null;

  const childLabel =
    family.members.length === 1
      ? "1 menor vinculado"
      : `${family.members.length} menores vinculados`;

  return (
    <section aria-labelledby="family-overview-title" className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-ink-500 text-sm font-bold">{childLabel}</p>
          <h2
            id="family-overview-title"
            className="font-display text-pool-deep text-xl leading-tight font-extrabold"
          >
            Tu familia
          </h2>
        </div>
        {family.pending_approval_count > 0 ? (
          <Link
            href={"/shop/parents/pending" as Route}
            className="bg-ball-gold/20 text-pool-deep focus-visible:ring-pool-blue hover:bg-ball-gold/30 inline-flex min-h-12 touch-manipulation items-center gap-2 rounded-xl px-3 text-sm font-extrabold transition-[background-color,transform] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.98] motion-reduce:transition-none"
          >
            <span className="bg-ball-gold flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 font-mono text-sm tabular-nums">
              {family.pending_approval_count}
            </span>
            Por revisar
          </Link>
        ) : null}
      </div>

      <p className="text-ink-600 -mt-1 text-sm text-pretty">
        Consulta a tus hijos desde la misma cuenta, sin cambiar de perfil.
      </p>

      <div className="border-ink-200 bg-paper-card shadow-elev-1 divide-ink-200 divide-y overflow-hidden rounded-2xl border">
        {family.members.map((member) => (
          <FamilyMemberRow key={member.id} member={member} />
        ))}
      </div>

      <nav
        aria-label="Gestiones de la familia"
        className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2"
      >
        <FamilyAction
          href="/shop/parents/pending"
          icon={ShoppingBag}
          label={family.pending_approval_count > 0 ? "Revisar pedidos" : "Pedidos de tus hijos"}
          detail={
            family.pending_approval_count > 0
              ? `${family.pending_approval_count} ${family.pending_approval_count === 1 ? "solicitud pendiente" : "solicitudes pendientes"}`
              : "No hay solicitudes pendientes"
          }
        />
        <FamilyAction
          href="/treasury"
          icon={ReceiptText}
          label="Cuotas familiares"
          detail={
            pendingTreasuryCents > 0
              ? `${formatTreasuryCents(pendingTreasuryCents)} pendientes`
              : "Todo al día"
          }
        />
      </nav>
    </section>
  );
}

function FamilyMemberRow({ member }: { member: FamilyMemberOverview }) {
  const team = member.teams[0] ?? null;
  const teamLabel =
    member.teams.length > 0
      ? member.teams.map((item) => item.label).join(" · ")
      : "Sin equipo esta temporada";

  return (
    <article className="flex items-center gap-3 px-3 py-3 sm:px-4">
      <Avatar
        name={member.full_name}
        src={member.photo_url}
        size={52}
        teamColor={member.team_color ?? team?.color ?? "var(--pool-blue)"}
      />
      <div className="min-w-0 flex-1">
        <h3 className="text-pool-deep truncate font-extrabold">{member.full_name}</h3>
        <p className="text-ink-600 mt-0.5 truncate text-sm font-semibold">{teamLabel}</p>
        {member.pending_order_count > 0 ? (
          <p className="text-action mt-1 text-sm font-bold">
            {member.pending_order_count === 1
              ? "1 pedido pendiente"
              : `${member.pending_order_count} pedidos pendientes`}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href={`/attendance/history?player=${member.id}` as Route}
          aria-label={`Ver asistencia de ${member.display_name}`}
          className="text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue flex h-12 w-12 touch-manipulation items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <CalendarCheck2 className="h-5 w-5" aria-hidden="true" />
        </Link>
        {team ? (
          <Link
            href={`/team/${team.id}/players/${member.id}?from=profile` as Route}
            aria-label={`Ver ficha de ${member.display_name}`}
            className="text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue flex h-12 w-12 touch-manipulation items-center justify-center rounded-xl transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function FamilyAction({
  href,
  icon: Icon,
  label,
  detail,
}: {
  href: string;
  icon: typeof UsersRound;
  label: string;
  detail: string;
}) {
  return (
    <Link
      href={href as Route}
      className="border-ink-200 bg-paper-card shadow-elev-1 hover:border-pool-blue/35 focus-visible:ring-pool-blue group flex min-h-17 touch-manipulation items-center gap-3 rounded-xl border px-3 py-2.5 transition-[border-color,transform] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99] motion-reduce:transition-none"
    >
      <span className="bg-pool-foam text-pool-blue flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-pool-deep block text-sm font-extrabold">{label}</span>
        <span className="text-ink-500 mt-0.5 block text-sm leading-snug">{detail}</span>
      </span>
      <ChevronRight
        className="text-ink-400 h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
        aria-hidden="true"
      />
    </Link>
  );
}
