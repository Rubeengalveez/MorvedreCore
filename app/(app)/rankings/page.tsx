import { ClubRankingsPage } from "@/components/rankings/club-rankings-page";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {
  title: "Rankings — Morvedre Core",
  description: "Estadísticas reales de jugadores y equipos del club.",
};
export default function RankingsPage() {
  return <ClubRankingsPage view="season" />;
}
