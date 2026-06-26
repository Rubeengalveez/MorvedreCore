export default function TeamPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-deep">
          Tu equipo
        </h1>
        <p className="text-base leading-relaxed text-ink-600">
          Aquí verás la plantilla, convocatorias y resultados.
        </p>
      </header>
      <p className="text-sm text-ink-600">Próximamente — Fase 1</p>
    </div>
  );
}
