import { ClipboardList, Loader2 } from "lucide-react";

export function ActaLoadingIndicator({
  title = "Preparando tu acta…",
  description = "Recuperando la convocatoria y las jugadas guardadas.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="text-pool-deep text-center">
      <div
        aria-hidden="true"
        className="bg-pool-deep shadow-elev-2 relative mx-auto mb-7 grid h-20 w-20 place-items-center rounded-2xl text-white"
      >
        <ClipboardList className="h-9 w-9" />
        <span className="bg-ball-gold text-pool-deep ring-pool-ice absolute -right-2 -bottom-2 grid h-9 w-9 place-items-center rounded-full ring-4">
          <Loader2 className="h-5 w-5 motion-safe:animate-spin" />
        </span>
      </div>
      <p className="text-pool-blue text-sm font-extrabold tracking-widest uppercase">
        Acta en directo
      </p>
      <h2 className="font-display mt-2 text-2xl font-extrabold">{title}</h2>
      <p className="text-ink-700 mx-auto mt-3 max-w-xs text-base leading-relaxed">{description}</p>
    </div>
  );
}
