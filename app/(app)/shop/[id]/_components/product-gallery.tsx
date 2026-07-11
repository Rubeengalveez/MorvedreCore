"use client";

import { useState } from "react";

import { ShoppingBag } from "lucide-react";
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
    <div className="flex flex-col gap-3">
      <div className="border-ink-200 bg-pool-foam shadow-elev-2 relative aspect-[4/5] overflow-hidden rounded-[1.75rem] border">
        {activeImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeImage.url}
              alt={activeImage.alt ?? title}
              width={900}
              height={1125}
              className="h-full w-full object-cover"
            />
            <div className="from-pool-deep/28 pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t to-transparent" />
          </>
        ) : (
          <div className="text-pool-deep flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,var(--pool-foam),var(--paper))]">
            <ShoppingBag className="h-14 w-14" aria-hidden="true" />
          </div>
        )}
      </div>

      {ordered.length > 1 ? (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {ordered.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Ver foto ${index + 1}`}
              className={cn(
                "bg-paper-sunk focus-visible:ring-pool-blue relative h-18 w-18 shrink-0 touch-manipulation overflow-hidden rounded-xl border transition-[border-color,opacity,transform] duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97] motion-reduce:transition-none",
                active === index
                  ? "border-action ring-action/25 ring-2"
                  : "border-ink-300 opacity-75",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt=""
                width={144}
                height={144}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
