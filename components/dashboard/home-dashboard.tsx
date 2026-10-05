"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  HandCoins,
  MapPin,
  RefreshCw,
  Settings,
  ShoppingBag,
  UsersRound,
} from "lucide-react";
import { Balon, Megafone, Silbato } from "@/components/brand/pictograms";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import { shopPrimary, shopSecondary, shopControl } from "@/components/shop/shop-ui";
import { cn } from "@/lib/utils/cn";
import { homeDate, homeTime, type HomeEvent, type HomeTask } from "@/lib/domain/home";
import { trainingKindLabel } from "@/lib/domain/training-management";
import type { DashboardHomeData } from "@/server/queries/dashboard-home";

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pool-blue";

export function HomeDashboard({ data }: { data: DashboardHomeData }) {
  const router = useRouter();
  const availablePeople = data.people.filter((p) => p.teamIds.length || p.id !== data.ownId);
  const [personId, setPersonId] = useState(
    availablePeople.length === 1 && availablePeople[0].id !== data.ownId
      ? availablePeople[0].id
      : "all",
  );
  const [openedEvent, setOpenedEvent] = useState<HomeEvent | null>(null);
  const people = availablePeople;
  const person = data.people.find((p) => p.id === personId);
  const events =
    personId === "all" ? data.events : data.events.filter((e) => e.personIds.includes(personId));
  const sportPerson = person ?? data.people.find((p) => p.id === data.ownId);
  const stats = sportPerson ? data.stats[sportPerson.id] : null;
  const result =
    data.result && (!person || person.teamIds.includes(data.result.team_id)) ? data.result : null;
  useEffect(() => {
    function refresh() {
      if (
        !openedEvent &&
        document.visibilityState === "visible" &&
        Date.now() - new Date(data.now).getTime() > 60000
      )
        router.refresh();
    }
    const timer = window.setInterval(refresh, 300000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [data.now, router, openedEvent]);
  return (
    <div className="text-pool-deep space-y-5">
      <HomeIdentity name={data.name} now={data.now} unread={data.unread} />
      {data.issues.length > 0 && (
        <div
          role="status"
          className="border-pool-deep rounded-xl border-2 bg-amber-50 p-3 text-sm font-semibold"
        >
          <p>No pudimos actualizar {data.issues.join(", ")}.</p>
          <button
            type="button"
            onClick={() => router.refresh()}
            className={cn(shopSecondary, "mt-2 w-full bg-white")}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Volver a intentar
          </button>
        </div>
      )}
      {data.tasks.length > 0 && <HomeAttention tasks={data.tasks} />}
      <div
        className={cn(
          "grid items-start gap-5",
          (data.news.length > 0 || data.management.length > 0) &&
            "md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]",
        )}
      >
        <div className="min-w-0 space-y-5">
          <section aria-labelledby="home-agenda">
            <HomeHeading
              id="home-agenda"
              title="Tu agenda"
              href="/calendar?from=dashboard"
              linkLabel="Calendario"
            />
            {people.length > 1 && (
              <div className="mt-3">
                <label
                  htmlFor="home-person"
                  className="mb-1.5 flex items-center gap-2 text-sm font-bold"
                >
                  <UsersRound className="h-4 w-4" aria-hidden="true" />
                  Actividad de
                </label>
                <select
                  id="home-person"
                  value={personId}
                  onChange={(e) => setPersonId(e.target.value)}
                  className={cn(shopControl, "w-full bg-white font-bold")}
                >
                  <option value="all">Toda la familia</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id === data.ownId ? "Mi actividad" : p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="mt-3" aria-live="polite" aria-atomic="false">
              {events[0] ? (
                <HomeNextEvent
                  event={events[0]}
                  now={data.now}
                  onOpen={() => setOpenedEvent(events[0])}
                />
              ) : (
                <HomeQuiet
                  hasSeason={data.hasSeason}
                  hasTeams={
                    person
                      ? person.teamIds.length > 0
                      : data.people.some((p) => p.teamIds.length > 0)
                  }
                  unavailable={data.issues.includes("agenda")}
                />
              )}
              {events.length > 1 && (
                <ul aria-label="Después" className="mt-3 space-y-2">
                  {events.slice(1, 4).map((event) => (
                    <li key={`${event.kind}-${event.id}`}>
                      <button
                        type="button"
                        onClick={() => setOpenedEvent(event)}
                        className={cn(
                          "border-pool-deep/65 flex min-h-20 w-full items-center gap-3 rounded-xl border bg-white p-3 text-left active:bg-blue-50",
                          focus,
                        )}
                        aria-label={`${event.kind === "match" ? event.title : trainingKindLabel(event.training_kind ?? "water")}. ${homeDate(event.scheduled_at, data.now, true)}. ${event.team_label}`}
                      >
                        <span className="border-pool-deep/70 flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border bg-blue-50">
                          <span className="text-xs font-bold uppercase">
                            {new Intl.DateTimeFormat("es-ES", {
                              timeZone: "Europe/Madrid",
                              month: "short",
                            })
                              .format(new Date(event.scheduled_at))
                              .replace(".", "")}
                          </span>
                          <strong className="text-xl leading-none tabular-nums">
                            {new Intl.DateTimeFormat("es-ES", {
                              timeZone: "Europe/Madrid",
                              day: "numeric",
                            }).format(new Date(event.scheduled_at))}
                          </strong>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-base font-extrabold">
                            {event.kind === "match"
                              ? `Contra ${event.opponent ?? event.title.replace("Partido contra ", "")}`
                              : trainingKindLabel(event.training_kind ?? "water")}
                          </span>
                          <span className="mt-0.5 block text-sm font-bold">
                            {homeDate(event.scheduled_at, data.now, true)}
                          </span>
                          <span className="block truncate text-sm font-medium">
                            {event.team_label}
                          </span>
                        </span>
                        <ChevronRight
                          className="text-pool-blue h-5 w-5 shrink-0"
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
          {stats && stats.matches > 0 && (
            <section
              aria-label={
                sportPerson?.id === data.ownId
                  ? "Tu temporada"
                  : `La temporada de ${sportPerson?.name}`
              }
              className="ring-pool-deep/70 rounded-xl bg-blue-50 p-3 ring-1"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="min-w-0 flex-1 text-base font-extrabold">
                  {sportPerson?.id === data.ownId ? (
                    "Tu temporada"
                  ) : (
                    <AdaptivePlayerName name={sportPerson?.name ?? ""} />
                  )}
                </h2>
                <Link
                  href="/rankings"
                  className={cn(
                    "text-pool-blue flex min-h-12 shrink-0 items-center gap-1 px-1 text-sm font-bold",
                    focus,
                  )}
                >
                  Rankings
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
              <dl className="grid grid-cols-3 gap-2">
                {[
                  ["Partidos", stats.matches],
                  ["Goles", stats.goals],
                  ["Asistencias", stats.assists],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col text-center">
                    <dt className="order-2 mt-1 text-sm font-semibold">{label}</dt>
                    <dd className="order-1 text-3xl font-extrabold tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
          {result && <HomeResult result={result} now={data.now} />}
        </div>
        <div className="min-w-0 space-y-5">
          {data.news.length > 0 && <HomeNews news={data.news} />}
          {data.management.length > 0 && (
            <section aria-labelledby="home-management">
              <HomeHeading id="home-management" title="Tu gestión" />
              <nav aria-label="Tu gestión" className="mt-3 grid grid-cols-2 gap-3">
                {data.management.map((item) => {
                  const Icon = {
                    attendance: ClipboardList,
                    admin: Settings,
                    shop: ShoppingBag,
                    treasury: HandCoins,
                  }[item.kind];
                  return (
                    <Link
                      key={item.href}
                      href={item.href as Route}
                      className={cn(
                        "border-pool-deep/70 flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border-2 bg-blue-50 p-3 text-center text-sm font-extrabold",
                        data.management.length === 1 && "col-span-2 min-h-14 flex-row",
                        focus,
                      )}
                    >
                      <Icon className="text-pool-blue h-6 w-6" aria-hidden="true" />
                      <span className="whitespace-nowrap">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </section>
          )}
        </div>
      </div>
      <HomeEventDetails event={openedEvent} data={data} onClose={() => setOpenedEvent(null)} />
    </div>
  );
}

function HomeIdentity({ name, now, unread }: { name: string; now: string; unread: number | null }) {
  const date = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    weekday: "long",
    day: "numeric",
    month: "short",
  })
    .format(new Date(now))
    .replaceAll(".", "");
  return (
    <header className="border-pool-deep bg-pool-deep overflow-hidden rounded-2xl border-2 p-4 text-white sm:p-5">
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-ball-gold text-sm font-extrabold">Morvedre Core</p>
          <h1 className="mt-1 text-2xl leading-tight font-extrabold sm:text-3xl">
            <AdaptivePlayerName name={`Hola, ${name.trim().split(/\s+/)[0]}`} />
          </h1>
          <time dateTime={now} className="mt-2 block text-sm font-semibold capitalize">
            {date}
          </time>
        </div>
        <Image
          src="/brand/logo.webp"
          alt="Escudo del Waterpolo Morvedre"
          width={88}
          height={88}
          priority
          className="h-20 w-20 shrink-0 object-contain sm:h-24 sm:w-24"
        />
      </div>
      {unread != null && unread > 0 && (
        <Link
          href="/notifications"
          className="focus-visible:outline-ball-gold mt-3 flex min-h-12 items-center justify-between gap-3 rounded-xl border border-white/75 bg-white/10 px-3 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <span className="flex items-center gap-2">
            <Bell className="h-4 w-4" aria-hidden="true" />
            Avisos sin leer
          </span>
          <span className="flex items-center gap-2">
            <strong
              className="border-pool-deep bg-ball-gold text-pool-deep rounded-md border px-2 py-0.5 tabular-nums"
              aria-label={`${unread} avisos sin leer`}
            >
              {unread > 99 ? "99+" : unread}
            </strong>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </Link>
      )}
    </header>
  );
}

function HomeHeading({
  id,
  title,
  href,
  linkLabel,
}: {
  id: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 id={id} className="min-w-0 text-lg font-extrabold min-[360px]:text-xl">
        {title}
      </h2>
      {href && (
        <Link
          href={href as Route}
          className={cn(
            "text-pool-blue flex min-h-12 shrink-0 items-center gap-1 rounded-lg px-1 text-sm font-extrabold",
            focus,
          )}
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function HomeAttention({ tasks }: { tasks: HomeTask[] }) {
  return (
    <section
      aria-labelledby="home-attention"
      className="border-pool-deep rounded-2xl border-2 bg-amber-50 p-3"
    >
      <h2 id="home-attention" className="mb-2 flex items-center gap-2 text-base font-extrabold">
        <ClipboardList className="h-5 w-5" aria-hidden="true" />
        Para resolver
      </h2>
      <ul className="space-y-2">
        {tasks.map((task) => {
          const Icon = { orders: ShoppingBag, attendance: ClipboardList, live: Balon }[task.kind];
          return (
            <li key={task.id}>
              <Link
                href={task.href as Route}
                prefetch={false}
                className={cn(
                  "border-pool-deep/65 flex min-h-16 items-center gap-3 rounded-xl border bg-white p-3",
                  focus,
                )}
              >
                <Icon className="text-pool-blue h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-extrabold">{task.title}</span>
                  <span className="block truncate text-sm font-medium">{task.detail}</span>
                </span>
                {task.count > 1 && (
                  <span
                    className="border-pool-deep shrink-0 rounded-md border bg-blue-50 px-2 py-1 text-sm font-extrabold tabular-nums"
                    aria-label={`${task.count}`}
                  >
                    {task.count > 999 ? "999+" : task.count}
                  </span>
                )}
                <ChevronRight className="text-pool-blue h-5 w-5 shrink-0" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EventTeams({ event }: { event: HomeEvent }) {
  return (
    <ul aria-label="Equipos" className="flex flex-wrap gap-1.5">
      {[...new Set(event.team_label.split(" · "))].map((team) => (
        <li
          key={team}
          className="border-pool-deep/75 rounded-md border bg-blue-50 px-2 py-1 text-xs font-bold"
        >
          {team}
        </li>
      ))}
    </ul>
  );
}

function HomeNextEvent({
  event,
  now,
  onOpen,
}: {
  event: HomeEvent;
  now: string;
  onOpen: () => void;
}) {
  const match = event.kind === "match";
  const Icon = match ? Balon : Silbato;
  return (
    <article className="border-pool-deep overflow-hidden rounded-2xl border-2 bg-white">
      <button
        type="button"
        onClick={onOpen}
        className="focus-visible:outline-pool-blue block w-full text-left focus-visible:outline-2 focus-visible:-outline-offset-4 active:bg-blue-50"
        aria-label={`Ver ${match ? "partido" : "entrenamiento"}: ${event.title}, ${homeDate(event.scheduled_at, now, true)}`}
      >
        <span className="bg-pool-deep flex min-h-12 items-center justify-between gap-2 px-3 py-2 text-white">
          <span className="flex items-center gap-2 text-sm font-extrabold">
            <Icon className="h-5 w-5" aria-hidden="true" />
            {match ? "Partido" : trainingKindLabel(event.training_kind ?? "water")}
          </span>
          <span className="text-ball-gold text-sm font-bold whitespace-nowrap">
            {event.status === "in_progress" ? "En juego" : homeDate(event.scheduled_at, now)}
          </span>
        </span>
        <span className="block space-y-3 p-4">
          <span className="flex items-baseline justify-between gap-3">
            <strong className="text-3xl font-extrabold tabular-nums">
              {homeTime(event.scheduled_at)}
            </strong>
            {!match && event.duration_minutes && (
              <span className="text-base font-bold">
                hasta{" "}
                {homeTime(
                  new Date(
                    new Date(event.scheduled_at).getTime() + event.duration_minutes * 60000,
                  ).toISOString(),
                )}
              </span>
            )}
          </span>
          <span className="block min-w-0 truncate text-xl font-extrabold">
            {match
              ? `Contra ${event.opponent ?? event.title.replace("Partido contra ", "")}`
              : event.title === "Agua" || event.title === "Entrenamiento"
                ? "Entrenamiento de agua"
                : event.title}
          </span>
          <EventTeams event={event} />
          {event.calledPersonIds.length > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-900 bg-emerald-50 px-2 py-1 text-sm font-bold text-emerald-950">
              <Check className="h-4 w-4" aria-hidden="true" />
              En la convocatoria
            </span>
          )}
          <span className="flex items-center gap-2 text-sm font-semibold">
            <MapPin className="text-pool-blue h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">{event.location || "Lugar pendiente"}</span>
          </span>
          <span className="border-pool-deep flex min-h-12 items-center justify-between rounded-xl border-2 bg-blue-50 px-3 text-base font-extrabold">
            <span>Ver {match ? "partido" : "entrenamiento"}</span>
            <ChevronRight className="text-pool-blue h-5 w-5" aria-hidden="true" />
          </span>
        </span>
      </button>
    </article>
  );
}

function HomeQuiet({
  hasSeason,
  hasTeams,
  unavailable,
}: {
  hasSeason: boolean;
  hasTeams: boolean;
  unavailable: boolean;
}) {
  return (
    <div className="border-pool-deep/70 flex items-center gap-3 rounded-xl border-2 bg-white p-4">
      <CalendarDays className="text-pool-blue h-8 w-8 shrink-0" aria-hidden="true" />
      <div>
        <h3 className="text-base font-extrabold">
          {unavailable
            ? "Agenda no disponible"
            : hasSeason
              ? "Sin actividad próxima"
              : "Preparando la temporada"}
        </h3>
        <p className="mt-1 text-sm font-medium">
          {unavailable
            ? "Vuelve a intentar cargarla desde el aviso de arriba."
            : hasTeams
              ? "No hay fechas programadas para los próximos 30 días."
              : "Tu actividad aparecerá cuando el club la programe."}
        </p>
      </div>
    </div>
  );
}

function HomeResult({
  result,
  now,
}: {
  result: NonNullable<DashboardHomeData["result"]>;
  now: string;
}) {
  const home = result.is_home ? "Morvedre" : result.opponent;
  const away = result.is_home ? result.opponent : "Morvedre";
  const us = result.final_score_us ?? 0,
    them = result.final_score_them ?? 0;
  const outcome = us > them ? "Victoria" : us < them ? "Derrota" : "Empate";
  return (
    <section aria-labelledby="home-result">
      <HomeHeading id="home-result" title="Último resultado" />
      <Link
        href={`/matches/${result.id}?from=dashboard` as Route}
        className={cn(
          "border-pool-deep/70 mt-3 block overflow-hidden rounded-2xl border-2 bg-white",
          focus,
        )}
      >
        <span className="bg-pool-deep flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-bold text-white">
          <span className="truncate">{result.team_label}</span>
          <span
            className={cn(
              "shrink-0 rounded-md border px-2 py-0.5",
              outcome === "Victoria"
                ? "border-emerald-900 bg-emerald-100 text-emerald-950"
                : outcome === "Derrota"
                  ? "border-red-900 bg-red-50 text-red-950"
                  : "text-pool-deep border-white bg-blue-50",
            )}
          >
            {outcome}
          </span>
        </span>
        <span className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-4 text-center">
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold" title={home}>
              {home}
            </span>
            <strong className="mt-1 block text-4xl font-extrabold tabular-nums">
              {result.regulationScore?.home ?? (result.is_home ? us : them)}
            </strong>
          </span>
          <span className="text-xl font-bold" aria-hidden="true">
            –
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold" title={away}>
              {away}
            </span>
            <strong className="mt-1 block text-4xl font-extrabold tabular-nums">
              {result.regulationScore?.away ?? (result.is_home ? them : us)}
            </strong>
          </span>
        </span>
        {result.regulationScore && (
          <span className="border-pool-deep/70 mx-3 mb-2 flex justify-center rounded-lg border bg-blue-50 px-2 py-1 text-sm font-bold">
            {result.is_home ? us : them}–{result.is_home ? them : us} con penaltis
          </span>
        )}
        <span className="flex min-h-12 items-center justify-between gap-2 px-3 pb-2 text-sm font-semibold">
          <time dateTime={result.scheduled_at}>{homeDate(result.scheduled_at, now)}</time>
          <span className="text-pool-blue flex items-center gap-1 font-bold">
            Ver partido
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </span>
      </Link>
    </section>
  );
}

function HomeNews({ news }: { news: DashboardHomeData["news"] }) {
  return (
    <section aria-labelledby="home-news">
      <HomeHeading id="home-news" title="El club al día" href="/news" linkLabel="Noticias" />
      <ul className="mt-3 space-y-3">
        {news.map((post, index) => (
          <li key={post.id}>
            <Link
              href={`/news/${post.id}?from=dashboard` as Route}
              className={cn(
                "border-pool-deep/70 block overflow-hidden rounded-2xl border-2 bg-white",
                focus,
              )}
            >
              {index === 0 && post.image_url && (
                <span className="relative block aspect-[16/9] overflow-hidden bg-blue-50">
                  <Image
                    src={post.image_url}
                    alt=""
                    fill
                    sizes="(min-width:768px) 300px, 100vw"
                    className="object-cover"
                  />
                </span>
              )}
              <span className="flex items-start gap-3 p-3.5">
                {!(index === 0 && post.image_url) && (
                  <span className="border-pool-deep/70 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-blue-50">
                    <Megafone className="text-pool-blue h-6 w-6" aria-hidden="true" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="mb-1 flex flex-wrap items-center gap-2 text-xs font-bold">
                    <time dateTime={post.published_at}>
                      {new Intl.DateTimeFormat("es-ES", {
                        timeZone: "Europe/Madrid",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(post.published_at))}
                    </time>
                    {post.pinned && (
                      <span className="border-pool-deep bg-ball-gold rounded-md border px-1.5 py-0.5">
                        Destacado
                      </span>
                    )}
                  </span>
                  <span className="line-clamp-2 block text-base leading-snug font-extrabold">
                    {post.title}
                  </span>
                  {post.audience_team_label && (
                    <span className="mt-1 block text-sm font-semibold">
                      {post.audience_team_label}
                    </span>
                  )}
                </span>
                <ChevronRight className="text-pool-blue mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function HomeEventDetails({
  event,
  data,
  onClose,
}: {
  event: HomeEvent | null;
  data: DashboardHomeData;
  onClose: () => void;
}) {
  if (!event) return null;
  const match = event.kind === "match";
  const participants = data.people.filter((p) => event.personIds.includes(p.id));
  const fullDate = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(event.scheduled_at));
  return (
    <ActaGuardSheet
      open
      onOpenChange={(open) => !open && onClose()}
      context={match ? "PARTIDO" : "ENTRENAMIENTO"}
      title={
        match
          ? `Contra ${event.opponent ?? event.title.replace("Partido contra ", "")}`
          : event.title
      }
      description="Consulta la fecha, el lugar y quién participa."
      icon="saved"
      actions={[]}
      body={
        <div className="space-y-3">
          <div className="border-pool-deep rounded-xl border-2 bg-white p-4">
            <p className="text-base font-bold first-letter:uppercase">{fullDate}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">
              {homeTime(event.scheduled_at)}
              {event.duration_minutes
                ? ` — ${homeTime(new Date(new Date(event.scheduled_at).getTime() + event.duration_minutes * 60000).toISOString())}`
                : ""}
            </p>
            <div className="mt-3">
              <EventTeams event={event} />
            </div>
          </div>
          <div className="border-pool-deep/70 rounded-xl border-2 bg-blue-50 p-3">
            <p className="flex items-start gap-2 font-bold">
              <MapPin className="text-pool-blue mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              {event.location || "El club todavía no ha indicado el lugar."}
            </p>
            {event.maps_url && /^https?:\/\//i.test(event.maps_url) && (
              <a
                href={event.maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(shopSecondary, "mt-3 w-full bg-white")}
              >
                Cómo llegar
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            )}
          </div>
          {data.people.length > 1 && participants.length > 0 && (
            <div className="border-pool-deep/70 rounded-xl border bg-white p-3">
              <p className="mb-2 text-sm font-bold">Quién participa</p>
              <ul className="space-y-2">
                {participants.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-base font-semibold">
                    <UsersRound className="text-pool-blue h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <AdaptivePlayerName name={p.name} />
                    </span>
                    {event.calledPersonIds.includes(p.id) && (
                      <span className="rounded-md border border-emerald-900 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-950">
                        Convocado
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {match && (
            <Link
              href={`/matches/${event.id}?from=dashboard` as Route}
              className={cn(shopPrimary, "w-full")}
            >
              Ver convocatoria y partido
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          )}
          {match && event.canOpenActa && (
            <a
              href={`/acta?match=${event.id}&from=dashboard`}
              className={cn(shopSecondary, "w-full bg-blue-50")}
            >
              {event.status === "in_progress" ? "Continuar acta" : "Abrir acta"}
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
            </a>
          )}
          <button type="button" onClick={onClose} className={cn(shopSecondary, "w-full bg-white")}>
            Volver a Inicio
          </button>
        </div>
      }
    />
  );
}
