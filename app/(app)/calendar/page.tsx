export default function CalendarPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-4">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-brand-deep">
          Calendario
        </h1>
        <p className="text-sm leading-relaxed text-ink-600">
          Aquí verás tus entrenos, partidos y eventos.
        </p>
      </header>
      <p className="text-sm text-ink-600">Próximamente — Fase 2</p>
    </div>
  );
}
