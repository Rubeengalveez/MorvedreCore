import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CarFront, ChevronLeft, Clock3, MapPin, Users } from "lucide-react";

import {
  CancelTravelOfferButton,
  TravelControls,
  TravelReservationButton,
} from "@/components/travel/travel-controls";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { formatLongDate, formatTimeOfDay } from "@/lib/domain/calendar";
import {
  DEFAULT_TRAVEL_MEETING_POINT,
  availableTravelSeats,
  formatTravelCompensation,
} from "@/lib/domain/travel";
import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getMatchTravel } from "@/server/queries/travel";

export const metadata: Metadata = { title: "Desplazamiento — Morvedre Core" };
export const dynamic = "force-dynamic";

function localDateTimeInput(iso: string): string {
  const date = new Date(iso);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default async function MatchTravelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const travel = await getMatchTravel(id, ctx.ownProfile.id);
  if (!travel) notFound();

  const meetingPoint = travel.travel_meeting_point ?? DEFAULT_TRAVEL_MEETING_POINT;
  const suggestedDeparture = new Date(new Date(travel.scheduled_at).getTime() - 90 * 60_000);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-4 pb-8">
      <Link
        href={`/matches/${id}`}
        className="text-pool-blue inline-flex min-h-11 items-center gap-1 self-start text-sm font-bold"
      >
        <ChevronLeft className="h-5 w-5" />
        Partido
      </Link>

      <header className="bg-pool-deep overflow-hidden rounded-lg text-white">
        <div className="flex items-start gap-4 p-5">
          <div className="bg-ball-gold text-pool-deep flex h-12 w-12 shrink-0 items-center justify-center rounded-md">
            <CarFront className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white/65">{travel.team_label}</p>
            <h1 className="truncate text-xl font-black">Viaje a {travel.opponent}</h1>
            <p className="mt-1 text-sm font-semibold text-white/75">
              {formatLongDate(travel.scheduled_at)} · {formatTimeOfDay(travel.scheduled_at)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-white/15">
          <div className="border-r border-white/15 p-4">
            <p className="text-xs font-bold text-white/55">PUNTO DE ENCUENTRO</p>
            <p className="mt-1 text-sm font-bold">{meetingPoint}</p>
          </div>
          <div className="p-4">
            <p className="text-xs font-bold text-white/55">COMPENSACIÓN</p>
            <p className="mt-1 text-sm font-bold">
              {formatTravelCompensation(travel.travel_compensation_cents)} por coche
            </p>
          </div>
        </div>
      </header>

      {travel.is_home ? (
        <Alert variant="info" title="Este partido es en casa">
          La logística de coches solo se utiliza en desplazamientos.
        </Alert>
      ) : null}

      {!travel.logistics_enabled && !travel.is_manager ? (
        <Alert variant="info" title="Desplazamiento todavía cerrado">
          El staff activará los coches cuando tenga confirmado el viaje.
        </Alert>
      ) : null}

      {!travel.is_home ? (
        <TravelControls
          matchId={id}
          defaultMeetingPoint={meetingPoint}
          compensationCents={travel.travel_compensation_cents}
          logisticsEnabled={travel.logistics_enabled}
          isManager={travel.is_manager}
          departureAtDefault={localDateTimeInput(suggestedDeparture.toISOString())}
        />
      ) : null}

      {travel.logistics_enabled ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-ink-500 text-sm font-bold">COCHES DISPONIBLES</p>
              <h2 className="text-ink-900 text-xl font-black">
                {travel.offers.filter((offer) => !offer.cancelled).length} opciones
              </h2>
            </div>
            <Users className="text-pool-blue h-6 w-6" />
          </div>

          {travel.offers.filter((offer) => !offer.cancelled).length === 0 ? (
            <div className="border-ink-200 bg-paper-card rounded-lg border-2 border-dashed px-5 py-10 text-center">
              <CarFront className="text-ink-300 mx-auto h-10 w-10" />
              <p className="text-ink-900 mt-3 font-bold">Todavía no hay coches</p>
              <p className="text-ink-500 mt-1 text-sm">El primero que se ofrezca aparecerá aquí.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {travel.offers
                .filter((offer) => !offer.cancelled)
                .map((offer) => {
                  const seatsLeft = availableTravelSeats(offer);
                  const myReservation = offer.passengers.some(
                    (passenger) => passenger.player_id === ctx.activeProfile.id,
                  );
                  const mayCancel = offer.driver_id === ctx.ownProfile.id || travel.is_manager;

                  return (
                    <article
                      key={offer.id}
                      className="border-ink-200 bg-paper-card overflow-hidden rounded-lg border"
                    >
                      <div className="flex items-center gap-3 p-4">
                        <Avatar src={offer.driver_photo_url} name={offer.driver_name} size={48} />
                        <div className="min-w-0 flex-1">
                          <p className="text-ink-900 truncate text-base font-black">
                            {offer.driver_name}
                          </p>
                          <p className="text-ink-500 truncate text-sm font-semibold">
                            {offer.vehicle_label}
                          </p>
                        </div>
                        <div className="bg-pool-foam text-pool-deep rounded-md px-3 py-2 text-center">
                          <p className="font-mono text-xl font-black">{seatsLeft}</p>
                          <p className="text-[11px] font-bold">libres</p>
                        </div>
                      </div>

                      <div className="border-ink-200 grid grid-cols-1 gap-2 border-y px-4 py-3 min-[420px]:grid-cols-2">
                        <p className="text-ink-700 flex items-center gap-2 text-sm font-semibold">
                          <Clock3 className="text-pool-blue h-4 w-4 shrink-0" />
                          {formatTimeOfDay(offer.departure_at)}
                        </p>
                        <p className="text-ink-700 flex min-w-0 items-center gap-2 text-sm font-semibold">
                          <MapPin className="text-pool-blue h-4 w-4 shrink-0" />
                          <span className="truncate">{offer.departure_from}</span>
                        </p>
                      </div>

                      {offer.notes ? (
                        <p className="text-ink-600 px-4 pt-3 text-sm">{offer.notes}</p>
                      ) : null}

                      {offer.passengers.length > 0 ? (
                        <div className="flex flex-wrap gap-2 px-4 pt-3">
                          {offer.passengers.map((passenger) => (
                            <span
                              key={passenger.player_id}
                              className="bg-ink-100 text-ink-700 rounded-full px-3 py-1.5 text-sm font-bold"
                            >
                              {passenger.full_name}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      <div className="flex flex-col gap-2 p-4">
                        <TravelReservationButton
                          offerId={offer.id}
                          playerId={ctx.activeProfile.id}
                          reserved={myReservation}
                          disabled={!myReservation && seatsLeft === 0}
                        />
                        {mayCancel ? <CancelTravelOfferButton offerId={offer.id} /> : null}
                      </div>
                    </article>
                  );
                })}
            </div>
          )}
        </section>
      ) : null}
    </main>
  );
}
