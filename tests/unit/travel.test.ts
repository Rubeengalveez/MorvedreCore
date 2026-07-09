import { describe, expect, it } from "vitest";

import {
  availableTravelSeats,
  canDepartBeforeMatch,
  formatTravelCompensation,
  travelOfferIsFull,
} from "@/lib/domain/travel";
import { configureMatchTravelSchema, createTravelOfferSchema } from "@/lib/domain/travel-schemas";

const matchId = "a0f4f7ba-c1dd-46ae-b99b-4c80fc4f16d2";

describe("travel logistics", () => {
  it("calculates available seats", () => {
    expect(availableTravelSeats({ seats_total: 5, seats_taken: 2, cancelled: false })).toBe(3);
  });

  it("never exposes seats from cancelled offers", () => {
    const offer = { seats_total: 5, seats_taken: 1, cancelled: true };
    expect(availableTravelSeats(offer)).toBe(0);
    expect(travelOfferIsFull(offer)).toBe(true);
  });

  it("formats compensation in euros", () => {
    expect(formatTravelCompensation(3000)).toBe("30 €");
    expect(formatTravelCompensation(3050)).toBe("30,50 €");
  });

  it("requires departure before the match", () => {
    expect(canDepartBeforeMatch("2026-07-10T16:00:00Z", "2026-07-10T18:00:00Z")).toBe(true);
    expect(canDepartBeforeMatch("2026-07-10T19:00:00Z", "2026-07-10T18:00:00Z")).toBe(false);
  });

  it("accepts a valid offer and caps seats at six", () => {
    const base = {
      match_id: matchId,
      vehicle_label: "Seat León blanco",
      departure_from: "Piscina Municipal",
      departure_at: "2026-07-10T16:00:00+02:00",
    };
    expect(createTravelOfferSchema.safeParse({ ...base, seats_total: 4 }).success).toBe(true);
    expect(createTravelOfferSchema.safeParse({ ...base, seats_total: 7 }).success).toBe(false);
  });

  it("validates match travel configuration", () => {
    expect(
      configureMatchTravelSchema.safeParse({
        match_id: matchId,
        logistics_enabled: true,
        travel_meeting_point: "Piscina Municipal",
        travel_compensation_cents: 3000,
      }).success,
    ).toBe(true);
  });
});
