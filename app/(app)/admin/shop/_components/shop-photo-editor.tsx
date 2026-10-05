"use client";

import { useRef } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, GripVertical, ImagePlus, Trash2 } from "lucide-react";
import { moveShopPhoto } from "@/lib/domain/shop-catalog";
import { shopSecondary } from "./shop-ui";

export interface ShopPhoto {
  key: string;
  url: string;
  id?: string;
  file?: File;
}
export function ShopPhotoEditor({
  photos,
  onChange,
  onAdd,
  disabled,
}: {
  photos: ShopPhoto[];
  onChange: (photos: ShopPhoto[]) => void;
  onAdd: (files: File[]) => Promise<void>;
  disabled: boolean;
}) {
  const upload = useRef<HTMLInputElement>(null);
  const dragging = useRef<number | null>(null);
  return (
    <div className="space-y-3">
      <input
        ref={upload}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-label="Seleccionar fotos del producto"
        disabled={disabled}
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          void onAdd(files);
        }}
      />
      <button
        type="button"
        className={`${shopSecondary} !bg-pool-foam w-full`}
        disabled={disabled || photos.length === 8}
        onClick={() => upload.current?.click()}
      >
        <ImagePlus aria-hidden="true" className="h-5 w-5" /> Añadir fotos · {photos.length}/8
      </button>
      <p className="text-sm font-semibold">Hasta 8 fotos · JPG, PNG o WebP · 5 MB por foto</p>
      {photos.length > 0 && (
        <>
          <p className="border-pool-deep bg-pool-foam rounded-xl border p-3 text-sm font-bold">
            La primera foto es la portada. Usa las flechas o arrastra el asa para cambiar el orden.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo, index) => (
              <div
                key={photo.key}
                data-shop-photo-index={index}
                className="border-pool-deep/70 overflow-hidden rounded-xl border-2 bg-white"
              >
                <div className="relative">
                  <Image
                    src={photo.url}
                    alt={`Foto ${index + 1}${index === 0 ? ", portada" : ""}`}
                    width={240}
                    height={240}
                    unoptimized
                    className="aspect-square w-full object-cover"
                  />
                  <span className="border-pool-deep absolute top-2 left-2 rounded-lg border bg-white px-2 py-1 text-sm font-bold">
                    {index === 0 ? "Portada" : `Foto ${index + 1}`}
                  </span>
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Eliminar foto ${index + 1}`}
                    className="focus-visible:outline-pool-blue absolute top-2 right-2 flex h-12 w-12 items-center justify-center rounded-xl border-2 border-red-900 bg-red-50 text-red-900 focus-visible:outline-2"
                    onClick={() => onChange(photos.filter((item) => item.key !== photo.key))}
                  >
                    <Trash2 aria-hidden="true" className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Arrastrar foto ${index + 1} para cambiar el orden`}
                    disabled={disabled}
                    className="border-pool-deep bg-pool-foam focus-visible:outline-pool-blue absolute right-2 bottom-2 flex h-12 w-12 touch-none items-center justify-center rounded-xl border-2 focus-visible:outline-2"
                    onPointerDown={(event) => {
                      dragging.current = index;
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={(event) => {
                      if (dragging.current === null) return;
                      const target = document
                        .elementFromPoint(event.clientX, event.clientY)
                        ?.closest<HTMLElement>("[data-shop-photo-index]");
                      const next = Number(target?.dataset.shopPhotoIndex);
                      if (target && Number.isInteger(next) && next !== dragging.current) {
                        onChange(moveShopPhoto(photos, dragging.current, next));
                        dragging.current = next;
                      }
                    }}
                    onPointerUp={() => {
                      dragging.current = null;
                    }}
                    onPointerCancel={() => {
                      dragging.current = null;
                    }}
                  >
                    <GripVertical aria-hidden="true" className="h-6 w-6" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 p-1">
                  <button
                    type="button"
                    disabled={disabled || index === 0}
                    aria-label={`Mover foto ${index + 1} antes`}
                    className={`${shopSecondary} !bg-pool-foam !min-w-0 !px-0`}
                    onClick={() => onChange(moveShopPhoto(photos, index, index - 1))}
                  >
                    <ArrowLeft aria-hidden="true" className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    disabled={disabled || index === photos.length - 1}
                    aria-label={`Mover foto ${index + 1} después`}
                    className={`${shopSecondary} !bg-pool-foam !min-w-0 !px-0`}
                    onClick={() => onChange(moveShopPhoto(photos, index, index + 1))}
                  >
                    <ArrowRight aria-hidden="true" className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
