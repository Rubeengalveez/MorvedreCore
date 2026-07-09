export const MAX_TRAVEL_SEATS = 6;
export const DEFAULT_TRAVEL_COMPENSATION_CENTS = 3000;
export const DEFAULT_TRAVEL_MEETING_POINT = "Piscina Municipal Puerto de Sagunto";

export interface TravelOfferCapacity {
  seats_total: number;
  seats_taken: number;
  cancelled: boolean;
}

export function availableTravelSeats(offer: TravelOfferCapacity): number {
  if (offer.cancelled) return 0;
  return Math.max(0, offer.seats_total - offer.seats_taken);
}

export function travelOfferIsFull(offer: TravelOfferCapacity): boolean {
  return availableTravelSeats(offer) === 0;
}

export function formatTravelCompensation(cents: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(cents / 100) ? 0 : 2,
  }).format(cents / 100);
}

export function canDepartBeforeMatch(departureAt: string, matchAt: string): boolean {
  const departure = new Date(departureAt).getTime();
  const match = new Date(matchAt).getTime();
  return Number.isFinite(departure) && Number.isFinite(match) && departure < match;
}
