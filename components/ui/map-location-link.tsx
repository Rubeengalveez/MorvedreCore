import { ExternalLink, MapPin } from "lucide-react";

import { isSafeMapsUrl } from "@/lib/domain/maps";
import { cn } from "@/lib/utils/cn";

export function MapLocationLink({
  name,
  address,
  mapsUrl,
  className,
  compact = false,
}: {
  name?: string | null;
  address?: string | null;
  mapsUrl?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const title = name || address || "Ubicación";
  const secondary = address && address !== title ? address : null;
  const safeUrl = mapsUrl && isSafeMapsUrl(mapsUrl) ? mapsUrl : null;
  const content = compact ? (
    <>
      <span className="bg-pool-foam text-pool-blue flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
        <MapPin className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-pool-deep block truncate text-sm font-extrabold">{title}</span>
        {secondary ? (
          <span className="text-ink-600 mt-0.5 line-clamp-2 block text-sm leading-5 font-semibold">
            {secondary}
          </span>
        ) : null}
      </span>
      {safeUrl ? (
        <ExternalLink className="text-pool-blue h-4 w-4 shrink-0" aria-hidden="true" />
      ) : null}
    </>
  ) : (
    <>
      <span className="bg-pool-foam text-pool-blue flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
        <MapPin className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-pool-deep block truncate text-sm leading-tight font-extrabold">
          {title}
        </span>
        {secondary ? (
          <span className="text-ink-600 mt-1 line-clamp-2 block text-sm leading-snug">
            {secondary}
          </span>
        ) : null}
      </span>
      {safeUrl ? (
        <span className="text-pool-blue inline-flex shrink-0 items-center gap-1 text-sm font-extrabold">
          <span className="hidden min-[420px]:inline">Ver mapa</span>
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </span>
      ) : null}
    </>
  );

  const styles = cn(
    compact
      ? "bg-pool-foam/55 flex min-h-12 w-full items-center gap-2 rounded-lg px-2 py-2 text-left"
      : `border-ink-200 bg-paper grid min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left ${safeUrl ? "grid-cols-[2.5rem_minmax(0,1fr)_auto]" : "grid-cols-[2.5rem_minmax(0,1fr)]"}`,
    safeUrl &&
      "hover:border-pool-blue hover:bg-pool-foam/45 focus-visible:ring-pool-blue touch-manipulation transition-[background-color,border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.99] motion-reduce:transition-none",
    className,
  );

  if (!safeUrl) {
    return <div className={styles}>{content}</div>;
  }

  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={styles}
      aria-label={`Abrir ${title} en el mapa`}
    >
      {content}
    </a>
  );
}
