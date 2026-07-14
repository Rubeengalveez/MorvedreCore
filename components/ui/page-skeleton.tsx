import { cn } from "@/lib/utils/cn";

export function PageSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <main
      className={cn("page-gutter mx-auto flex w-full max-w-3xl flex-col gap-5 py-5", className)}
      aria-busy="true"
      aria-label="Cargando contenido"
    >
      <div className="border-ink-200 flex items-center gap-4 border-b pb-4">
        <div className="skeleton-pulse bg-pool-foam h-12 w-12 shrink-0 rounded-xl motion-reduce:animate-none" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="skeleton-pulse bg-pool-foam h-3 w-24 rounded motion-reduce:animate-none" />
          <div className="skeleton-pulse bg-ink-200 h-7 w-2/3 rounded-lg motion-reduce:animate-none" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="skeleton-pulse bg-paper-sunk border-ink-200 h-20 rounded-xl border motion-reduce:animate-none"
          />
        ))}
      </div>
      <section className="border-ink-200 bg-paper-card rounded-2xl border p-4">
        <div className="skeleton-pulse bg-pool-foam h-4 w-36 rounded motion-reduce:animate-none" />
        <div className="mt-4 flex flex-col gap-3">
          {Array.from({ length: rows }, (_, index) => (
            <div
              key={index}
              className="skeleton-pulse bg-paper-sunk border-ink-200 h-18 rounded-xl border motion-reduce:animate-none"
            />
          ))}
        </div>
      </section>
      <span className="sr-only" aria-live="polite">
        Cargando…
      </span>
    </main>
  );
}
