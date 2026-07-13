import { randomUUID } from "node:crypto";

import { admin, loadBatch, mergeBatch, rand, randInt, randPick, resetRng } from "./base.mjs";

const VEHICLES = [
  "Renault Mégane",
  "Toyota Corolla",
  "Kia Sportage",
  "Seat León",
  "Dacia Jogger",
  "Peugeot 3008",
];
const DEPARTURES = [
  "Piscina Municipal",
  "Parking del pabellón",
  "Rotonda de Periodista Azzati",
  "Estación de Sagunto",
];

async function main() {
  resetRng();
  console.log("[travel] Generando desplazamientos, coches y reservas...\n");

  const batch = loadBatch() ?? {};
  const driverIds = [
    ...new Set([...(batch.parentIds ?? []), ...(batch.delIds ?? []), ...(batch.dirIds ?? [])]),
  ];
  const playerIdsByTeam = batch.playerIdByTeamLabel ?? {};
  if (driverIds.length < 4) throw new Error("No hay suficientes conductores demo.");

  const { data: awayMatches, error: matchError } = await admin
    .from("matches")
    .select("id, team_id, scheduled_at, teams(label)")
    .eq("is_home", false)
    .in("status", ["scheduled", "postponed"])
    .order("scheduled_at");
  if (matchError) throw matchError;
  if (!awayMatches?.length) throw new Error("No hay partidos futuros fuera de casa.");

  const offerIds = [];
  let reservationCount = 0;
  for (let matchIndex = 0; matchIndex < awayMatches.length; matchIndex++) {
    const match = awayMatches[matchIndex];
    const teamLabel = match.teams?.label;
    const players = [...(playerIdsByTeam[teamLabel] ?? [])];
    if (players.length === 0) continue;

    const { error: logisticsError } = await admin
      .from("matches")
      .update({
        logistics_enabled: true,
        travel_meeting_point: "Piscina Municipal de Puerto de Sagunto",
        travel_compensation_cents: 3000,
      })
      .eq("id", match.id);
    if (logisticsError) throw logisticsError;

    const shuffledPlayers = players.sort(() => rand() - 0.5);
    let playerCursor = 0;
    for (let offerIndex = 0; offerIndex < 2; offerIndex++) {
      const offerId = randomUUID();
      const seatsTotal = randInt(3, 5);
      const departureAt = new Date(
        new Date(match.scheduled_at).getTime() - (90 + offerIndex * 15) * 60000,
      );
      const cancelled = matchIndex === awayMatches.length - 1 && offerIndex === 1;
      const { error: offerError } = await admin.from("travel_offers").insert({
        id: offerId,
        match_id: match.id,
        driver_id: driverIds[(matchIndex * 2 + offerIndex) % driverIds.length],
        vehicle_label: randPick(VEHICLES),
        seats_total: seatsTotal,
        seats_taken: 0,
        departure_from: randPick(DEPARTURES),
        departure_at: departureAt.toISOString(),
        notes: offerIndex === 0 ? "Cabe una mochila grande por jugador." : null,
        cancelled,
      });
      if (offerError) throw offerError;
      offerIds.push(offerId);
      if (cancelled) continue;

      const activeReservations = Math.min(
        randInt(1, seatsTotal),
        shuffledPlayers.length - playerCursor,
      );
      for (let index = 0; index < activeReservations; index++) {
        const playerId = shuffledPlayers[playerCursor++];
        if (!playerId) break;
        const { error } = await admin.from("travel_reservations").insert({
          offer_id: offerId,
          match_id: match.id,
          player_id: playerId,
          created_at: new Date(departureAt.getTime() - 3 * 86400000).toISOString(),
          cancelled_at: null,
        });
        if (error) throw error;
        reservationCount++;
      }
      if (matchIndex === 0 && offerIndex === 0 && shuffledPlayers[playerCursor]) {
        const { error } = await admin.from("travel_reservations").insert({
          offer_id: offerId,
          match_id: match.id,
          player_id: shuffledPlayers[playerCursor],
          created_at: new Date(departureAt.getTime() - 4 * 86400000).toISOString(),
          cancelled_at: new Date(departureAt.getTime() - 2 * 86400000).toISOString(),
        });
        if (error) throw error;
        reservationCount++;
      }
    }
  }

  mergeBatch({ travelOfferIds: offerIds, travelReservationCount: reservationCount });
  console.log(
    `[travel] OK: ${awayMatches.length} desplazamientos, ${offerIds.length} coches y ${reservationCount} reservas.`,
  );
}

main().catch((error) => {
  console.error("[travel] FATAL:", error);
  process.exit(1);
});
