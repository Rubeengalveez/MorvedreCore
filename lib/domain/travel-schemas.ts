import { z } from "zod";

import { MAX_TRAVEL_SEATS } from "./travel";

const uuid = z.string().uuid("Identificador no válido.");

export const createTravelOfferSchema = z.object({
  match_id: uuid,
  vehicle_label: z.string().trim().min(2, "Indica el vehículo.").max(80),
  seats_total: z.coerce.number().int().min(1).max(MAX_TRAVEL_SEATS),
  departure_from: z.string().trim().min(2, "Indica el punto de salida.").max(160),
  departure_at: z.string().datetime({ offset: true }),
  notes: z.string().trim().max(300).optional().nullable(),
});

export const reserveTravelSeatSchema = z.object({
  offer_id: uuid,
  player_id: uuid,
});

export const cancelTravelReservationSchema = reserveTravelSeatSchema;

export const cancelTravelOfferSchema = z.object({
  offer_id: uuid,
});

export const configureMatchTravelSchema = z.object({
  match_id: uuid,
  logistics_enabled: z.boolean(),
  travel_meeting_point: z.string().trim().min(2).max(160),
  travel_compensation_cents: z.coerce.number().int().min(0).max(100000),
});

export type CreateTravelOfferInput = z.infer<typeof createTravelOfferSchema>;
