import { ClubRankingsPage } from "@/components/rankings/club-rankings-page";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {
  title: "Leyendas — Morvedre Core",
  description: "Goles, partidos, MVP y mejores marcas históricas del club.",
};
export default function LegendsPage() {
  return <ClubRankingsPage view="legends" />;
}
