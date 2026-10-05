export function getRankingPlayerProfileHref(teamId: string, playerId: string, rankingHref: string) {
  const params = new URLSearchParams({
    from: "rankings",
    returnTo: `${rankingHref}#ranking-player-${playerId}`,
  });
  return `/team/${teamId}/players/${playerId}?${params.toString()}`;
}

export function getPlayerProfileBackTarget(
  source: string | undefined,
  teamId: string,
  returnTo?: string,
  playerId?: string,
) {
  if (source === "family" || source === "profile-activity") {
    return {
      href: source === "family" ? "/profile/family" : "/profile/activity",
      label: source === "family" ? "Mi familia" : "Mi actividad",
    };
  }
  if (source === "profile") {
    return {
      href: "/profile",
      label: "Volver a mi perfil",
    };
  }

  if (source === "rankings") {
    const fallback = { href: "/rankings", label: "Volver a Rankings" };
    if (!returnTo || !playerId) return fallback;
    try {
      const url = new URL(returnTo, "https://morvedre.local");
      if (
        url.origin !== "https://morvedre.local" ||
        url.pathname !== "/rankings" ||
        url.hash !== `#ranking-player-${playerId}`
      )
        return fallback;
      return { href: `${url.pathname}${url.search}${url.hash}`, label: "Volver a Rankings" };
    } catch {
      return fallback;
    }
  }

  return {
    href: `/team/${teamId}?tab=jugadores`,
    label: "Volver a la plantilla",
  };
}
