export default function RootLoading() {
  return (
    <main
      className="page-gutter mx-auto flex w-full max-w-3xl flex-col gap-4 py-5"
      aria-busy="true"
      aria-label="Cargando contenido"
    >
      <div className="bg-pool-deep/10 h-40 animate-pulse rounded-[1.75rem] motion-reduce:animate-none" />
      <div className="border-ink-200 bg-paper-card rounded-2xl border p-4">
        <div className="bg-pool-foam h-5 w-32 animate-pulse rounded motion-reduce:animate-none" />
        <div className="mt-4 flex flex-col gap-3">
          <div className="bg-paper-sunk h-16 animate-pulse rounded-xl motion-reduce:animate-none" />
          <div className="bg-paper-sunk h-16 animate-pulse rounded-xl motion-reduce:animate-none" />
          <div className="bg-paper-sunk h-16 animate-pulse rounded-xl motion-reduce:animate-none" />
        </div>
      </div>
      <span className="sr-only" aria-live="polite">
        Cargando…
      </span>
    </main>
  );
}
