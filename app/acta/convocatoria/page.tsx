import type { Metadata } from "next";
import { LocalCallupEditor } from "@/components/matches/local-callup-editor";

export const metadata: Metadata = {
  title: "Corregir convocatoria | Morvedre Core",
};

export default function LiveCallupPage() {
  return (
    <main className="app-stage min-h-dvh">
      <LocalCallupEditor />
    </main>
  );
}
