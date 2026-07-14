"use client";

import { Camera, Check, Minus, Plus, RotateCcw, Upload } from "lucide-react";
import NextImage from "next/image";
import { useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface ImageSize {
  width: number;
  height: number;
}

export function AvatarEditor({
  name,
  currentUrl,
  teamColor,
  onChange,
}: {
  name: string;
  currentUrl: string | null;
  teamColor: string;
  onChange: (file: File | null, removeCurrent: boolean) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [size, setSize] = useState<ImageSize | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [frameWidth, setFrameWidth] = useState(288);

  useEffect(
    () => () => {
      if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    },
    [sourceUrl],
  );
  useEffect(
    () => () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !sourceUrl) return;
    const updateWidth = () => setFrameWidth(frame.getBoundingClientRect().width || 288);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [sourceUrl]);

  function clampOffset(next: { x: number; y: number }, nextZoom = zoom) {
    if (!size || !frameRef.current) return next;
    const frame = frameRef.current.getBoundingClientRect().width;
    const scale = Math.max(frame / size.width, frame / size.height) * nextZoom;
    const maxX = Math.max(0, (size.width * scale - frame) / 2);
    const maxY = Math.max(0, (size.height * scale - frame) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    };
  }

  function chooseFile(file: File | null) {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError("Elige una imagen JPG o PNG de hasta 5 MB.");
      return;
    }
    if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
    setSourceUrl(URL.createObjectURL(file));
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setMessage(null);
    setError(null);
  }

  async function applyCrop() {
    if (!sourceUrl || !size || !frameRef.current) return;
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();
    const frame = frameRef.current.getBoundingClientRect().width;
    const scale = Math.max(frame / size.width, frame / size.height) * zoom;
    const renderedWidth = size.width * scale;
    const renderedHeight = size.height * scale;
    const left = (frame - renderedWidth) / 2 + offset.x;
    const top = (frame - renderedHeight) / 2 + offset.y;
    const sourceX = Math.max(0, -left / scale);
    const sourceY = Math.max(0, -top / scale);
    const sourceSide = Math.min(frame / scale, size.width - sourceX, size.height - sourceY);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d");
    if (!context) {
      setError("No pudimos preparar la imagen en este dispositivo.");
      return;
    }
    context.drawImage(image, sourceX, sourceY, sourceSide, sourceSide, 0, 0, 512, 512);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!blob) {
      setError("No pudimos preparar la imagen.");
      return;
    }
    const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    const nextPreview = URL.createObjectURL(blob);
    setPreviewUrl(nextPreview);
    setMessage("Encuadre preparado. Guarda el perfil para aplicarlo.");
    setError(null);
    onChange(file, false);
  }

  const scale = size ? Math.max(frameWidth / size.width, frameWidth / size.height) * zoom : 1;

  return (
    <section className="border-ink-200 bg-paper-card shadow-elev-1 rounded-2xl border p-4">
      <div className="flex items-center gap-3">
        <Avatar src={previewUrl} name={name} size={64} teamColor={teamColor} />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-pool-deep text-lg font-extrabold">Foto de perfil</h2>
          <p className="text-ink-600 mt-0.5 text-sm leading-relaxed">
            Se verá circular, con el color de tu categoría alrededor.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
        className="sr-only"
        onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
      />

      {sourceUrl ? (
        <div className="mt-4">
          <div
            ref={frameRef}
            className="bg-ink-900 relative mx-auto aspect-square w-full max-w-80 touch-none overflow-hidden rounded-2xl select-none"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              dragRef.current = {
                x: event.clientX,
                y: event.clientY,
                offsetX: offset.x,
                offsetY: offset.y,
              };
            }}
            onPointerMove={(event) => {
              if (!dragRef.current) return;
              setOffset(
                clampOffset({
                  x: dragRef.current.offsetX + event.clientX - dragRef.current.x,
                  y: dragRef.current.offsetY + event.clientY - dragRef.current.y,
                }),
              );
            }}
            onPointerUp={() => {
              dragRef.current = null;
            }}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
          >
            <NextImage
              src={sourceUrl}
              alt="Vista previa para recortar"
              width={size?.width ?? 512}
              height={size?.height ?? 512}
              unoptimized
              draggable={false}
              onLoad={(event) => {
                setSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight,
                });
              }}
              className="pointer-events-none absolute max-w-none"
              style={{
                width: size ? `${size.width * scale}px` : "auto",
                height: size ? `${size.height * scale}px` : "auto",
                left: `calc(50% + ${offset.x}px)`,
                top: `calc(50% + ${offset.y}px)`,
                transform: "translate(-50%, -50%)",
              }}
            />
            <span className="ring-ink-900/45 pointer-events-none absolute inset-0 rounded-2xl ring-[3rem] ring-inset" />
            <span className="border-paper/90 pointer-events-none absolute inset-8 rounded-full border-2" />
          </div>

          <div className="mx-auto mt-4 flex max-w-80 items-center gap-3">
            <Minus className="text-ink-500 h-4 w-4" aria-hidden="true" />
            <label htmlFor="avatar-zoom" className="sr-only">
              Acercar o alejar imagen
            </label>
            <input
              id="avatar-zoom"
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(event) => {
                const nextZoom = Number(event.target.value);
                setZoom(nextZoom);
                setOffset((current) => clampOffset(current, nextZoom));
                setMessage(null);
              }}
              className="accent-pool-blue h-12 min-w-0 flex-1 touch-manipulation"
            />
            <Plus className="text-ink-500 h-4 w-4" aria-hidden="true" />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
                setMessage(null);
              }}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Restablecer
            </Button>
            <Button type="button" onClick={applyCrop}>
              <Check className="h-4 w-4" aria-hidden="true" />
              Usar este encuadre
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="border-pool-blue/30 bg-pool-foam text-pool-deep focus-visible:ring-pool-blue mt-4 flex min-h-28 w-full touch-manipulation flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 font-extrabold focus-visible:ring-2 focus-visible:outline-none"
        >
          <Camera className="text-pool-blue h-7 w-7" aria-hidden="true" />
          Elegir foto JPG o PNG
        </button>
      )}

      {sourceUrl ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" aria-hidden="true" />
            Elegir otra
          </Button>
          {currentUrl || previewUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-goggle-red"
              onClick={() => {
                setSourceUrl(null);
                setPreviewUrl(null);
                setSize(null);
                setMessage("La foto se eliminará al guardar.");
                onChange(null, true);
              }}
            >
              Quitar foto
            </Button>
          ) : null}
        </div>
      ) : currentUrl ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-goggle-red mt-3"
          onClick={() => {
            setPreviewUrl(null);
            setMessage("La foto se eliminará al guardar.");
            onChange(null, true);
          }}
        >
          Quitar foto
        </Button>
      ) : null}

      {message ? (
        <p role="status" className="text-success mt-3 text-sm font-bold">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-goggle-red mt-3 text-sm font-bold">
          {error}
        </p>
      ) : null}
    </section>
  );
}
