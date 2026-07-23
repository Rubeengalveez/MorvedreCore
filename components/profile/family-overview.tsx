import Link from "next/link";
import type { Route } from "next";
import { CalendarDays, ChevronRight, Clock3, ReceiptText, ShoppingBag } from "lucide-react";

import { formatTimeRangeFromDuration } from "@/lib/domain/calendar";
import { formatTreasuryCents } from "@/lib/domain/treasury";
import { cn } from "@/lib/utils/cn";
import type { FamilyMemberOverview, FamilyOverview } from "@/server/queries/family";
import { Avatar } from "@/components/ui/avatar";

const eventDate = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const familyNames = new Intl.ListFormat("es-ES", {
  style: "long",
  type: "conjunction",
});

export function FamilyOverviewPanel({
  family,
  pendingTreasuryCents,
}: {
  family: FamilyOverview;
  pendingTreasuryCents: number;
}) {
  if (family.members.length === 0) return null;

  return (
    <section aria-labelledby="family-overview-title" className="flex flex-col gap-3">
      <FamilyPulse family={family} />

      <div className="flex flex-col gap-3">
        {family.members.map((member, index) => (
          <ChildLane
            key={member.id}
            member={member}
            position={index + 1}
            total={family.members.length}
          />
        ))}
      </div>

      <nav
        aria-label="Gestiones de la familia"
        className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-3"
      >
        <FamilyAction href="/calendar" icon={CalendarDays} label="Ver calendario" />
        <FamilyAction
          href="/shop/parents/pending"
          icon={ShoppingBag}
          label={family.pending_approval_count > 0 ? "Revisar pedidos" : "Pedidos de tus hijos"}
          count={family.pending_approval_count}
        />
        <FamilyAction
          href="/treasury"
          icon={ReceiptText}
          label="Cuotas y pagos"
          detail={
            pendingTreasuryCents > 0 ? formatTreasuryCents(pendingTreasuryCents) : "Todo al día"
          }
          wide
        />
      </nav>
    </section>
  );
}

function FamilyPulse({ family }: { family: FamilyOverview }) {
  const visibleMembers = family.members.slice(0, 2);
  const remainingMembers = Math.max(0, family.members.length - visibleMembers.length);
  const useExpandedHeader = family.members.length > 2;
  const memberCountLabel = `${family.members.length} ${family.members.length === 1 ? "menor" : "menores"} a tu cargo`;

  return (
    <header className="bg-pool-deep text-paper shadow-elev-2 overflow-hidden rounded-2xl">
      <div className="relative px-4 py-4 sm:px-5">
        <span
          aria-hidden="true"
          className="bg-pool-blue absolute -top-14 -right-10 h-36 w-36 rounded-full opacity-45 blur-2xl"
        />
        <div
          className={cn(
            "relative flex items-center gap-4",
            useExpandedHeader && "flex-wrap gap-y-3",
          )}
        >
          <div
            className={cn("flex shrink-0 -space-x-3", useExpandedHeader && "order-1")}
            aria-hidden="true"
          >
            {visibleMembers.map((member) => (
              <span key={member.id} className="border-pool-deep rounded-full border-2">
                <Avatar
                  name={member.full_name}
                  src={member.photo_url}
                  size={48}
                  teamColor={member.team_color ?? member.teams[0]?.color ?? "var(--pool-blue)"}
                />
              </span>
            ))}
            {remainingMembers > 0 ? (
              <span className="border-pool-deep bg-pool-blue text-paper flex h-12 w-12 items-center justify-center rounded-full border-2 font-mono text-sm font-extrabold">
                +{remainingMembers}
              </span>
            ) : null}
          </div>
          <div className={cn("min-w-0 flex-1", useExpandedHeader && "order-3 basis-full pl-0.5")}>
            <p className="text-pool-ice text-xs font-extrabold tracking-[0.08em] uppercase">
              {memberCountLabel}
            </p>
            <h2 id="family-overview-title" className="font-display mt-0.5 text-xl font-extrabold">
              Tu familia
            </h2>
            <p className="text-paper/75 mt-1 line-clamp-2 text-sm font-semibold text-pretty">
              {familyNames.format(family.members.map((member) => member.display_name))}
            </p>
          </div>
          {family.pending_approval_count > 0 ? (
            <Link
              href={"/shop/parents/pending" as Route}
              className={cn(
                "bg-ball-gold text-pool-deep focus-visible:ring-paper flex min-h-12 min-w-14 shrink-0 flex-col items-center justify-center rounded-xl px-2 shadow-sm focus-visible:ring-2 focus-visible:outline-none",
                useExpandedHeader && "order-2 ml-auto",
              )}
              aria-label={`${family.pending_approval_count} ${family.pending_approval_count === 1 ? "pedido" : "pedidos"} por revisar`}
            >
              <span className="font-mono text-base leading-none font-extrabold">
                {family.pending_approval_count}
              </span>
              <span className="mt-0.5 text-xs leading-tight font-extrabold uppercase">
                {family.pending_approval_count === 1 ? "pedido" : "pedidos"}
              </span>
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function ChildLane({
  member,
  position,
  total,
}: {
  member: FamilyMemberOverview;
  position: number;
  total: number;
}) {
  const event = member.next_event;
  const team = member.teams[0] ?? null;
  const eventTime = event
    ? event.kind === "training" && event.duration_minutes
      ? formatTimeRangeFromDuration(event.scheduled_at, event.duration_minutes)
      : new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(
          new Date(event.scheduled_at),
        )
    : null;

  return (
    <article className="border-ink-200 bg-paper-card shadow-elev-1 overflow-hidden rounded-2xl border">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <Avatar
          name={member.full_name}
          src={member.photo_url}
          size={54}
          teamColor={member.team_color ?? team?.color ?? "var(--pool-blue)"}
        />
        <div className="min-w-0 flex-1">
          <p className="text-pool-blue text-xs font-extrabold tracking-[0.08em] uppercase">
            En tu familia · {position} de {total}
          </p>
          <h3 className="font-display text-pool-deep line-clamp-2 text-lg leading-tight font-extrabold">
            {member.full_name}
          </h3>
          <p className="text-ink-600 truncate text-sm font-semibold">
            {member.teams.length > 0
              ? member.teams.map((item) => item.label).join(" · ")
              : "Sin equipo esta temporada"}
          </p>
        </div>
        {team ? (
          <Link
            href={`/team/${team.id}` as Route}
            className="text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue flex min-h-12 shrink-0 items-center justify-center gap-1 rounded-xl px-2.5 text-xs font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            aria-label={`Ver equipo de ${member.display_name}`}
          >
            Equipo
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        ) : null}
      </div>

      <div className="border-ink-200 grid grid-cols-3 border-y">
        <MiniStat value={member.stats?.matches_played ?? 0} label="Partidos" />
        <MiniStat value={member.stats?.goals ?? 0} label="Goles" />
        <MiniStat
          value={
            member.stats?.month_attendance_pct == null
              ? "—"
              : `${member.stats.month_attendance_pct}%`
          }
          label="Asist. mes"
        />
      </div>

      <div className="flex min-h-16 items-center gap-3 px-4 py-3">
        <span className="bg-pool-foam text-pool-blue flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
          <Clock3 className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-ink-600 text-xs font-extrabold tracking-[0.06em] uppercase">
            Próximo compromiso
          </p>
          {event ? (
            <p className="text-pool-deep truncate text-sm font-extrabold">
              {eventDate.format(new Date(event.scheduled_at))} · {eventTime}
            </p>
          ) : (
            <p className="text-ink-600 text-sm font-semibold">Sin actividad próxima</p>
          )}
        </div>
        {member.pending_order_count > 0 ? (
          <Link
            href={"/shop/parents/pending" as Route}
            className="bg-ball-gold/20 text-pool-deep hover:bg-ball-gold/30 focus-visible:ring-pool-blue flex min-h-12 shrink-0 items-center rounded-xl px-2.5 text-xs font-extrabold focus-visible:ring-2 focus-visible:outline-none"
          >
            {member.pending_order_count === 1 ? "Revisar pedido" : "Revisar pedidos"}
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function MiniStat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="border-ink-200 flex min-h-17 flex-col justify-center border-r px-3 py-2.5 last:border-r-0">
      <strong className="text-pool-deep font-mono text-lg leading-none tabular-nums">
        {value}
      </strong>
      <span className="text-ink-600 mt-1 text-xs font-bold uppercase">{label}</span>
    </div>
  );
}

function FamilyAction({
  href,
  icon: Icon,
  label,
  detail,
  count = 0,
  wide = false,
}: {
  href: string;
  icon: typeof CalendarDays;
  label: string;
  detail?: string;
  count?: number;
  wide?: boolean;
}) {
  return (
    <Link
      href={href as Route}
      aria-label={
        count > 0
          ? `${label}, ${count} ${count === 1 ? "pendiente" : "pendientes"}`
          : detail
            ? `${label}, ${detail}`
            : label
      }
      className={`border-ink-200 bg-paper-card shadow-elev-1 hover:border-pool-blue/35 focus-visible:ring-pool-blue flex min-h-16 items-center gap-3 rounded-xl border px-3 transition-[border-color,transform] focus-visible:ring-2 focus-visible:outline-none active:scale-[0.99] ${wide ? "min-[360px]:col-span-2 sm:col-span-1" : ""}`}
    >
      <span className="bg-pool-foam text-pool-blue flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="text-pool-deep min-w-0 flex-1 text-sm font-extrabold">
        {label}
        {detail ? (
          <span className="text-ink-500 mt-0.5 block text-xs font-semibold">{detail}</span>
        ) : null}
      </span>
      {count > 0 ? (
        <span className="bg-goggle-red text-paper flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-extrabold">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
