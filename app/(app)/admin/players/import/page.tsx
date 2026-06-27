import { ImportPlayersPanel } from "./_components/import-players-panel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Importar jugadores — Admin — Morvedre Core",
};

export default function ImportPlayersPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-brand-deep">
          Importar jugadores
        </h1>
        <p className="text-sm text-ink-600">
          Sube el Excel con el que venías trabajando. Lo importante es que
          respete las columnas: nombre, año, dorsal, equipo, tutor.
        </p>
      </header>
      <ImportPlayersPanel />
    </div>
  );
}
