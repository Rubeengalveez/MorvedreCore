import { ClubRankingsPage } from "@/components/rankings/club-rankings-page";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {
  title: "Rachas — Morvedre Core",
  description: "Rachas actuales y mejores marcas de jugadores y equipos.",
};
export default function StreaksPage() {
  return <ClubRankingsPage view="streaks" />;
}
