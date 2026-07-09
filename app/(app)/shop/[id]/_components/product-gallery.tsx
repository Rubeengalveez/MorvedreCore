"use client";

import { useState } from "react";

import { CapTile } from "@/components/ui/cap-tile";
import { cn } from "@/lib/utils/cn";

export interface ProductGalleryImage {
  id: string;
  url: string;
  alt: string | null;
  is_cover: boolean;
}

export function ProductGallery({
  title,
  images,
}: {
  title: string;
  images: ProductGalleryImage[];
}) {
  const ordered = images.length > 0 ? images : [];
  const coverIndex = Math.max(
    0,
    ordered.findIndex((image) => image.is_cover),
  );
  const [active, setActive] = useState(coverIndex);
  const activeImage = ordered[active] ?? ordered[0] ?? null;

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-pool-foam relative aspect-square overflow-hidden">
        {activeImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeImage.url}
              alt={activeImage.alt ?? title}
              className="h-full w-full object-cover"
            />
            <div className="from-pool-deep/28 pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t to-transparent" />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,var(--pool-foam),var(--paper))]">
            <CapTile number={1} teamColor="var(--pool-deep)" size="lg" />
          </div>
        )}
      </div>

      {ordered.length > 1 ? (
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-1 pb-1">
          {ordered.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Ver foto ${index + 1}`}
              className={cn(
                "bg-paper-sunk relative h-16 w-16 shrink-0 overflow-hidden rounded-md border transition-all",
                active === index
                  ? "border-action ring-action/25 ring-2"
                  : "border-ink-300 opacity-75",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
