import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface TravelCompanion {
  id: string;
  full_name: string;
}

export interface TravelPassenger {
  player_id: string;
  full_name: string;
  photo_url: string | null;
  companions: TravelCompanion[];
}

export interface TravelOfferView {
  id: string;
  driver_id: string;
  driver_name: string;
  driver_photo_url: string | null;
  vehicle_label: string;
  seats_total: number;
  seats_taken: number;
  departure_from: string;
  departure_at: string;
  notes: string | null;
  cancelled: boolean;
  passengers: TravelPassenger[];
}

export interface TravelChildOption {
  id: string;
  full_name: string;
  team_label: string | null;
}

export interface MatchTravelView {
  match_id: string;
  team_id: string;
  team_label: string;
  opponent: string;
  scheduled_at: string;
  is_home: boolean;
  status: string;
  logistics_enabled: boolean;
  travel_meeting_point: string | null;
  travel_compensation_cents: number;
  offers: TravelOfferView[];
  is_manager: boolean;
  is_parent: boolean;
  children: TravelChildOption[];
}

function joined<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function getMatchTravel(
  matchId: string,
  actorProfileId: string,
): Promise<MatchTravelView | null> {
  const supabase = await createClient();
  const admin = createAdminClient();
  const [{ data: match, error: matchError }, { data: offers, error: offersError }] =
    await Promise.all([
      supabase
        .from("matches")
        .select(
          "id, team_id, opponent, scheduled_at, is_home, status, logistics_enabled, travel_meeting_point, travel_compensation_cents, teams!matches_team_id_fkey(label)",
        )
        .eq("id", matchId)
        .maybeSingle(),
      admin
        .from("travel_offers")
        .select(
          "id, driver_id, vehicle_label, seats_total, seats_taken, departure_from, departure_at, notes, cancelled, profiles!travel_offers_driver_id_fkey(full_name, photo_url), travel_reservations(player_id, cancelled_at, profiles!travel_reservations_player_id_fkey(full_name, photo_url), travel_companions(id, full_name, cancelled_at))",
        )
        .eq("match_id", matchId)
        .order("departure_at", { ascending: true }),
    ]);

  if (matchError) throw new Error("No pudimos cargar el desplazamiento.");
  if (!match) return null;
  if (offersError && (match as { logistics_enabled: boolean }).logistics_enabled) {
    throw new Error("No pudimos cargar los coches disponibles.");
  }

  const teamId = (match as { team_id: string }).team_id;
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role, scope_team_id")
    .eq("profile_id", actorProfileId)
    .in("role", ["admin", "coach", "delegate"]);

  const isManager = ((roles ?? []) as Array<{ role: string; scope_team_id: string | null }>).some(
    (role) =>
      (role.role === "admin" && role.scope_team_id == null) ||
      ((role.role === "coach" || role.role === "delegate") && role.scope_team_id === teamId),
  );

  const { data: parentRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", actorProfileId)
    .eq("role", "parent")
    .maybeSingle();
  const isParent = Boolean(parentRole);

  const children: TravelChildOption[] = [];
  if (isParent) {
    const { data: links } = await admin
      .from("parent_child_links")
      .select(
        "child_profile_id, profiles!parent_child_links_child_profile_id_fkey(id, full_name, is_active)",
      )
      .eq("parent_profile_id", actorProfileId);
    const childIds = Array.from(
      new Set(
        ((links ?? []) as Array<{ child_profile_id: string }>).map(
          (l) => l.child_profile_id,
        ),
      ),
    );
    const { data: rosterRows } = childIds.length
      ? await admin
          .from("team_rosters")
          .select("player_id, teams(label, season_id)")
          .in("player_id", childIds)
          .is("left_at", null)
      : { data: [] };
    const teamByPlayer = new Map<string, string>();
    for (const row of (rosterRows ?? []) as Array<{
      player_id: string;
      teams:
        | { label: string; season_id: string }
        | { label: string; season_id: string }[]
        | null;
    }>) {
      const team = joined(row.teams);
      if (team) {
        teamByPlayer.set(row.player_id, team.label);
      }
    }
    const seen = new Set<string>();
    for (const link of (links ?? []) as Array<{
      child_profile_id: string;
      profiles:
        | { id: string; full_name: string; is_active: boolean }
        | { id: string; full_name: string; is_active: boolean }[]
        | null;
    }>) {
      const child = joined(link.profiles);
      if (!child || !child.is_active) continue;
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      children.push({
        id: child.id,
        full_name: child.full_name,
        team_label: teamByPlayer.get(child.id) ?? null,
      });
    }
    children.sort((a, b) => a.full_name.localeCompare(b.full_name, "es"));
  }

  const rows = (offers ?? []) as Array<{
    id: string;
    driver_id: string;
    vehicle_label: string;
    seats_total: number;
    seats_taken: number;
    departure_from: string;
    departure_at: string;
    notes: string | null;
    cancelled: boolean;
    profiles: unknown;
    travel_reservations: Array<{
      player_id: string;
      cancelled_at: string | null;
      profiles: unknown;
      travel_companions:
        | Array<{ id: string; full_name: string; cancelled_at: string | null }>
        | null;
    }> | null;
  }>;

  const offerViews = rows.map((offer) => {
    const driver = joined(offer.profiles) as {
      full_name?: string;
      photo_url?: string | null;
    } | null;
    const passengers = (offer.travel_reservations ?? [])
      .filter((reservation) => reservation.cancelled_at == null)
      .map((reservation) => {
        const profile = joined(reservation.profiles) as {
          full_name?: string;
          photo_url?: string | null;
        } | null;
        const companions: TravelCompanion[] = (reservation.travel_companions ?? [])
          .filter((c) => c.cancelled_at == null)
          .map((c) => ({ id: c.id, full_name: c.full_name }));
        return {
          player_id: reservation.player_id,
          full_name: profile?.full_name ?? "Jugador",
          photo_url: profile?.photo_url ?? null,
          companions,
        };
      });

    return {
      id: offer.id,
      driver_id: offer.driver_id,
      driver_name: driver?.full_name ?? "Conductor",
      driver_photo_url: driver?.photo_url ?? null,
      vehicle_label: offer.vehicle_label,
      seats_total: offer.seats_total,
      seats_taken: passengers.reduce(
        (sum, p) => sum + 1 + p.companions.length,
        0,
      ),
      departure_from: offer.departure_from,
      departure_at: offer.departure_at,
      notes: offer.notes,
      cancelled: offer.cancelled,
      passengers,
    };
  });

  const team = joined((match as { teams: unknown }).teams) as { label?: string } | null;
  return {
    match_id: (match as { id: string }).id,
    team_id: teamId,
    team_label: team?.label ?? "Equipo",
    opponent: (match as { opponent: string }).opponent,
    scheduled_at: (match as { scheduled_at: string }).scheduled_at,
    is_home: (match as { is_home: boolean }).is_home,
    status: (match as { status: string }).status,
    logistics_enabled: (match as { logistics_enabled: boolean }).logistics_enabled,
    travel_meeting_point: (match as { travel_meeting_point: string | null }).travel_meeting_point,
    travel_compensation_cents: (match as { travel_compensation_cents: number })
      .travel_compensation_cents,
    offers: offerViews,
    is_manager: isManager,
    is_parent: isParent,
    children,
  };
}
