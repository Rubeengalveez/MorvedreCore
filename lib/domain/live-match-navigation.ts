export function liveCallupReturn(matchId: string, from: string | null) {
  if (from === "acta") {
    return { href: `/acta?match=${matchId}`, label: "Volver al acta" };
  }
  if (from === "admin") {
    return { href: "/admin/matches", label: "Volver a partidos" };
  }
  return { href: `/matches/${matchId}`, label: "Volver al partido" };
}
