import { ExternalLink, MapPin } from "lucide-react";

import { isSafeMapsUrl } from "@/lib/domain/maps";
import { cn } from "@/lib/utils/cn";

export function MapLocationLink({
  name,
  address,
  mapsUrl,
  className,
}: {
  name?: string | null;
  address?: string | null;
  mapsUrl?: string | null;
  className?: string;
}) {
  const title = name || address || "Ubicación";
  const secondary = address && address !== title ? address : null;
  const safeUrl = mapsUrl && isSafeMapsUrl(mapsUrl) ? mapsUrl : null;
  const content = (
    <>
      <span className="bg-pool-foam text-pool-blue flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
        <MapPin className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-pool-deep block text-sm leading-tight font-extrabold text-pretty break-words">
          {title}
        </span>
        {secondary ? (
          <span className="text-ink-600 mt-1 block text-sm leading-snug text-pretty break-words">
            {secondary}
          </span>
        ) : null}
      </span>
      {safeUrl ? (
        <span className="text-pool-blue ml-auto inline-flex shrink-0 items-center gap-1 text-sm font-extrabold">
          <span className="hidden min-[360px]:inline">Ver mapa</span>
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </span>
      ) : null}
    </>
  );

  const styles = cn(
    "border-ink-200 bg-paper flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left",
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
