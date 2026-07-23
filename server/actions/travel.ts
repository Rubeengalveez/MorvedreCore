"use server";

import { revalidatePath } from "next/cache";

import { canDepartBeforeMatch } from "@/lib/domain/travel";
import {
  addTravelCompanionSchema,
  cancelTravelCompanionSchema,
  cancelTravelOfferSchema,
  cancelTravelReservationSchema,
  configureMatchTravelSchema,
  createTravelOfferSchema,
  reserveTravelSeatSchema,
} from "@/lib/domain/travel-schemas";
import { createClient } from "@/lib/supabase/server";
import { getActiveProfileContext } from "@/server/queries/active-profile";

export type TravelActionState = { ok: true; message: string } | { ok: false; error: string };

function failure(error: unknown, fallback: string): TravelActionState {
  if (error instanceof Error && error.message) return { ok: false, error: error.message };
  return { ok: false, error: fallback };
}

function revalidateTravel(matchId: string): void {
  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/matches/${matchId}/travel`);
  revalidatePath("/calendar");
}

async function requireTravelManager(matchId: string): Promise<{
  profileId: string;
  teamId: string;
}> {
  const ctx = await getActiveProfileContext();
  if (!ctx) throw new Error("No has iniciado sesión.");
  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select("team_id")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) throw new Error("No encontramos el partido.");

  const teamId = (match as { team_id: string }).team_id;
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role, scope_team_id")
    .eq("profile_id", ctx.ownProfile.id)
    .in("role", ["admin", "coach", "delegate"]);
  const allowed = ((roles ?? []) as Array<{ role: string; scope_team_id: string | null }>).some(
    (role) =>
      (role.role === "admin" && role.scope_team_id == null) ||
      ((role.role === "coach" || role.role === "delegate") && role.scope_team_id === teamId),
  );
  if (!allowed) throw new Error("No tienes permisos para gestionar este desplazamiento.");
  return { profileId: ctx.ownProfile.id, teamId };
}

export async function createTravelOffer(input: unknown): Promise<TravelActionState> {
  const parsed = createTravelOfferSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }

  try {
    const ctx = await getActiveProfileContext();
    if (!ctx) throw new Error("No has iniciado sesión.");
    const supabase = await createClient();
    const { data: match } = await supabase
      .from("matches")
      .select("scheduled_at")
      .eq("id", parsed.data.match_id)
      .maybeSingle();
    if (!match) throw new Error("No encontramos el partido.");
    if (
      !canDepartBeforeMatch(
        parsed.data.departure_at,
        (match as { scheduled_at: string }).scheduled_at,
      )
    ) {
      throw new Error("La salida debe ser anterior al partido.");
    }

    const { error } = await supabase.from("travel_offers").insert({
      match_id: parsed.data.match_id,
      driver_id: ctx.ownProfile.id,
      vehicle_label: parsed.data.vehicle_label,
      seats_total: parsed.data.seats_total,
      departure_from: parsed.data.departure_from,
      departure_at: parsed.data.departure_at,
      notes: parsed.data.notes || null,
    });
    if (error?.code === "23505") throw new Error("Ya has ofrecido un coche para este partido.");
    if (error) throw new Error("No pudimos publicar el coche.");
    revalidateTravel(parsed.data.match_id);
    return { ok: true, message: "Tu coche ya aparece en el desplazamiento." };
  } catch (error) {
    return failure(error, "No pudimos publicar el coche.");
  }
}

export async function reserveTravelSeat(input: unknown): Promise<TravelActionState> {
  const parsed = reserveTravelSeatSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "La reserva no es válida." };
  try {
    const ctx = await getActiveProfileContext();
    if (!ctx) throw new Error("No has iniciado sesión.");
    const supabase = await createClient();
    const { data: offer } = await supabase
      .from("travel_offers")
      .select("match_id")
      .eq("id", parsed.data.offer_id)
      .maybeSingle();
    if (!offer) throw new Error("Ese coche ya no está disponible.");
    const { error } = await supabase.rpc("reserve_travel_seat", {
      p_offer_id: parsed.data.offer_id,
      p_player_id: parsed.data.player_id,
    });
    if (error?.message.includes("OFFER_FULL")) throw new Error("Ese coche acaba de llenarse.");
    if (error?.message.includes("PLAYER_ALREADY_RESERVED")) {
      throw new Error("Ya tiene una plaza reservada en este desplazamiento.");
    }
    if (error?.message.includes("PLAYER_NOT_ALLOWED")) {
      throw new Error("No puedes reservar para esta persona.");
    }
    if (error?.message.includes("OFFER_NOT_AVAILABLE")) {
      throw new Error("Ese coche ya no está disponible.");
    }
    if (error) throw new Error("No pudimos reservar la plaza.");
    revalidateTravel((offer as { match_id: string }).match_id);
    return { ok: true, message: "Plaza reservada." };
  } catch (error) {
    return failure(error, "No pudimos reservar la plaza.");
  }
}

export async function cancelTravelReservation(input: unknown): Promise<TravelActionState> {
  const parsed = cancelTravelReservationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "La reserva no es válida." };
  try {
    const ctx = await getActiveProfileContext();
    if (!ctx) throw new Error("No has iniciado sesión.");
    const supabase = await createClient();
    const { data: offer } = await supabase
      .from("travel_offers")
      .select("match_id")
      .eq("id", parsed.data.offer_id)
      .maybeSingle();
    if (!offer) throw new Error("No encontramos el coche.");
    const { error } = await supabase
      .from("travel_reservations")
      .update({ cancelled_at: new Date().toISOString() })
      .eq("offer_id", parsed.data.offer_id)
      .eq("player_id", parsed.data.player_id)
      .is("cancelled_at", null);
    if (error) throw new Error("No pudimos cancelar la plaza.");
    revalidateTravel((offer as { match_id: string }).match_id);
    return { ok: true, message: "Plaza liberada." };
  } catch (error) {
    return failure(error, "No pudimos cancelar la plaza.");
  }
}

export async function addTravelCompanion(input: unknown): Promise<TravelActionState> {
  const parsed = addTravelCompanionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }
  try {
    const ctx = await getActiveProfileContext();
    if (!ctx) throw new Error("No has iniciado sesión.");
    const supabase = await createClient();
    const { data: offer } = await supabase
      .from("travel_offers")
      .select("match_id")
      .eq("id", parsed.data.offer_id)
      .maybeSingle();
    if (!offer) throw new Error("Ese coche ya no está disponible.");
    const { error } = await supabase.from("travel_companions").insert({
      offer_id: parsed.data.offer_id,
      reservation_offer_id: parsed.data.offer_id,
      reservation_player_id: parsed.data.player_id,
      full_name: parsed.data.full_name,
    });
    if (error?.message.includes("OFFER_FULL")) throw new Error("Ese coche acaba de llenarse.");
    if (error?.message.includes("OFFER_NOT_AVAILABLE")) {
      throw new Error("Ese coche ya no está disponible.");
    }
    if (error?.code === "23505") {
      throw new Error("Ya hay un acompañante con ese nombre en esta plaza.");
    }
    if (error) throw new Error("No pudimos añadir al acompañante.");
    revalidateTravel((offer as { match_id: string }).match_id);
    return { ok: true, message: "Acompañante añadido." };
  } catch (error) {
    return failure(error, "No pudimos añadir al acompañante.");
  }
}

export async function cancelTravelCompanion(input: unknown): Promise<TravelActionState> {
  const parsed = cancelTravelCompanionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Acompañante no válido." };
  try {
    const ctx = await getActiveProfileContext();
    if (!ctx) throw new Error("No has iniciado sesión.");
    const supabase = await createClient();
    const { data: companion, error: companionError } = await supabase
      .from("travel_companions")
      .select("offer_id, travel_offers(match_id)")
      .eq("id", parsed.data.companion_id)
      .maybeSingle();
    if (companionError || !companion) throw new Error("No encontramos al acompañante.");
    const matchId = (companion as { travel_offers: { match_id: string } | { match_id: string }[] | null })
      .travel_offers;
    const matchIdStr = Array.isArray(matchId) ? matchId[0]?.match_id : matchId?.match_id;
    if (!matchIdStr) throw new Error("No pudimos identificar el partido.");

    const { error } = await supabase
      .from("travel_companions")
      .update({ cancelled_at: new Date().toISOString() })
      .eq("id", parsed.data.companion_id)
      .is("cancelled_at", null);
    if (error) throw new Error("No pudimos cancelar al acompañante.");
    revalidateTravel(matchIdStr);
    return { ok: true, message: "Acompañante cancelado." };
  } catch (error) {
    return failure(error, "No pudimos cancelar al acompañante.");
  }
}

export async function cancelTravelOffer(input: unknown): Promise<TravelActionState> {
  const parsed = cancelTravelOfferSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "El coche no es válido." };
  try {
    const ctx = await getActiveProfileContext();
    if (!ctx) throw new Error("No has iniciado sesión.");
    const supabase = await createClient();
    const { data: offer } = await supabase
      .from("travel_offers")
      .select("match_id, driver_id")
      .eq("id", parsed.data.offer_id)
      .maybeSingle();
    if (!offer) throw new Error("No encontramos el coche.");
    if ((offer as { driver_id: string }).driver_id !== ctx.ownProfile.id) {
      await requireTravelManager((offer as { match_id: string }).match_id);
    }
    const { error } = await supabase
      .from("travel_offers")
      .update({ cancelled: true })
      .eq("id", parsed.data.offer_id);
    if (error) throw new Error("No pudimos cancelar el coche.");
    revalidateTravel((offer as { match_id: string }).match_id);
    return { ok: true, message: "Coche cancelado." };
  } catch (error) {
    return failure(error, "No pudimos cancelar el coche.");
  }
}

export async function configureMatchTravel(input: unknown): Promise<TravelActionState> {
  const parsed = configureMatchTravelSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }
  try {
    await requireTravelManager(parsed.data.match_id);
    const supabase = await createClient();
    const { error } = await supabase
      .from("matches")
      .update({
        logistics_enabled: parsed.data.logistics_enabled,
        travel_meeting_point: parsed.data.travel_meeting_point,
        travel_compensation_cents: parsed.data.travel_compensation_cents,
      })
      .eq("id", parsed.data.match_id);
    if (error) throw new Error("No pudimos guardar la configuración.");
    revalidateTravel(parsed.data.match_id);
    return { ok: true, message: "Desplazamiento actualizado." };
  } catch (error) {
    return failure(error, "No pudimos guardar la configuración.");
  }
}
