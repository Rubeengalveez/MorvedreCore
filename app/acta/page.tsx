import type { Metadata } from "next";
import { LiveMatchClient } from "@/components/matches/live-match-client";

export const metadata: Metadata = {
  title: "Acta en directo | Morvedre Core",
  description: "Mesa y acta en directo de partidos de waterpolo del Club Waterpolo Morvedre.",
};

export default function LiveMatchPage() {
  return <LiveMatchClient />;
}
