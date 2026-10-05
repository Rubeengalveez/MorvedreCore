"use client";

import { useEffect, useRef } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";

import type { MatchEditorValues } from "@/lib/domain/admin-matches";
import { HOME_LEAGUE_LOCATION, HOME_LEAGUE_MAPS_URL } from "@/lib/domain/match-venue";
import type { Team } from "@/server/actions/admin";

export function useMatchVenue(form: UseFormReturn<MatchEditorValues>, teams: Team[] = []) {
  const [home, competition, teamId] = useWatch({
    control: form.control,
    name: ["is_home", "competition_type", "team_id"],
  });
  const current = `${home}:${competition}:${teamId}`;
  const previous = useRef(current);
  const autoLocation = useRef(HOME_LEAGUE_LOCATION);
  const autoMaps = useRef(HOME_LEAGUE_MAPS_URL);
  useEffect(() => {
    if (previous.current === current) return;
    previous.current = current;
    const location = home
      ? competition === "league"
        ? HOME_LEAGUE_LOCATION
        : (teams.find((team) => team.id === teamId)?.home_pool ?? "")
      : "";
    const maps = home && competition === "league" ? HOME_LEAGUE_MAPS_URL : "";
    if (!form.getValues("location") || form.getValues("location") === autoLocation.current)
      form.setValue("location", location, { shouldDirty: true });
    if (!form.getValues("maps_url") || form.getValues("maps_url") === autoMaps.current)
      form.setValue("maps_url", maps, { shouldDirty: true });
    autoLocation.current = location;
    autoMaps.current = maps;
  }, [current, home, competition, teamId, teams, form]);
}
