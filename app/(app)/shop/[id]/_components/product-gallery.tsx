"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ShoppingBag, ZoomIn } from "lucide-react";

import { Sheet, SheetBody, SheetContent, SheetTitle } from "@/components/ui/sheet";
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
  const coverIndex = Math.max(
    0,
    images.findIndex((image) => image.is_cover),
  );
  const [active, setActive] = useState(coverIndex);
  const [expanded, setExpanded] = useState(false);
  const touchStart = useRef<number | null>(null);
  const activeImage = images[active] ?? images[0] ?? null;

  function show(index: number) {
    if (images.length === 0) return;
    setActive((index + images.length) % images.length);
  }

  function finishSwipe(clientX: number) {
    if (touchStart.current == null) return;
    const distance = clientX - touchStart.current;
    touchStart.current = null;
    if (Math.abs(distance) < 45) return;
    show(active + (distance < 0 ? 1 : -1));
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => activeImage && setExpanded(true)}
        disabled={!activeImage}
        className="border-ink-200 bg-pool-foam shadow-elev-2 group focus-visible:ring-pool-blue relative aspect-[4/5] overflow-hidden rounded-[1.75rem] border text-left focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-default"
        aria-label={activeImage ? `Ampliar imagen de ${title}` : undefined}
      >
        {activeImage ? (
          <>
            <Image
              src={activeImage.url}
              alt={activeImage.alt ?? title}
              width={900}
              height={1125}
              unoptimized
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
            />
            <span className="bg-pool-deep/85 text-paper shadow-elev-2 absolute right-3 bottom-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-extrabold">
              <ZoomIn className="h-4 w-4" aria-hidden="true" />
              Ampliar
            </span>
          </>
        ) : (
          <span className="text-pool-deep flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,var(--pool-foam),var(--paper))]">
            <ShoppingBag className="h-14 w-14" aria-hidden="true" />
          </span>
        )}
      </button>

      {images.length > 1 ? (
        <div
          className="no-scrollbar flex gap-2 overflow-x-auto pb-1"
          aria-label="Fotos del producto"
        >
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Ver foto ${index + 1} de ${images.length}`}
              aria-current={active === index ? "true" : undefined}
              className={cn(
                "bg-paper-sunk focus-visible:ring-pool-blue relative h-18 w-18 shrink-0 touch-manipulation overflow-hidden rounded-xl border transition-[border-color,opacity,transform] duration-200 focus-visible:ring-2 focus-visible:outline-none active:scale-[0.97] motion-reduce:transition-none",
                active === index
                  ? "border-action ring-action/25 ring-2"
                  : "border-ink-300 opacity-75",
              )}
            >
              <Image
                src={image.url}
                alt=""
                width={144}
                height={144}
                unoptimized
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}

      <Sheet open={expanded} onOpenChange={setExpanded}>
        <SheetContent
          size="full"
          className="bg-pool-deep text-paper border-pool-deep gap-2 rounded-none"
        >
          <SheetTitle className="sr-only">{title} ampliado</SheetTitle>
          <SheetBody className="flex min-h-0 items-center justify-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {activeImage ? (
              <div
                className="relative flex h-full w-full touch-pan-y items-center justify-center"
                onTouchStart={(event) => {
                  touchStart.current = event.changedTouches[0]?.clientX ?? null;
                }}
                onTouchEnd={(event) => finishSwipe(event.changedTouches[0]?.clientX ?? 0)}
              >
                <Image
                  src={activeImage.url}
                  alt={activeImage.alt ?? title}
                  width={1600}
                  height={2000}
                  unoptimized
                  className="max-h-full max-w-full object-contain"
                />
                {images.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => show(active - 1)}
                      className="bg-paper/90 text-pool-deep focus-visible:ring-ball-gold shadow-elev-3 absolute left-1 flex h-12 w-12 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:outline-none active:scale-95"
                      aria-label="Foto anterior"
                    >
                      <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => show(active + 1)}
                      className="bg-paper/90 text-pool-deep focus-visible:ring-ball-gold shadow-elev-3 absolute right-1 flex h-12 w-12 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:outline-none active:scale-95"
                      aria-label="Foto siguiente"
                    >
                      <ChevronRight className="h-6 w-6" aria-hidden="true" />
                    </button>
                    <span className="bg-ink-900/70 text-paper absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full px-3 py-1.5 text-sm font-bold tabular-nums">
                      {active + 1} / {images.length}
                    </span>
                  </>
                ) : null}
              </div>
            ) : null}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}
