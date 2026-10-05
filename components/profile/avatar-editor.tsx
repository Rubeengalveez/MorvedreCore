"use client";

import Image from "next/image";
import { Camera, ArrowDown, ArrowUp, ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import { shopPrimary, shopSecondary, ShopError } from "@/components/shop/shop-ui";

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
  const input = useRef<HTMLInputElement>(null),
    frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [width, setWidth] = useState(256);
  const [zoom, setZoom] = useState(1),
    [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null),
    [pending, setPending] = useState(false);
  const [changed, setChanged] = useState(false);
  useEffect(
    () => () => {
      if (source) URL.revokeObjectURL(source);
    },
    [source],
  );
  useEffect(
    () => () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  useEffect(() => {
    if (!source || !frame.current) return;
    const node = frame.current;
    const measure = () => setWidth(node.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [source, size]);
  function clamp(next: { x: number; y: number }, factor = zoom) {
    if (!size) return { x: 0, y: 0 };
    const scale = Math.max(width / size.width, width / size.height) * factor;
    const mx = Math.max(0, (size.width * scale - width) / 2),
      my = Math.max(0, (size.height * scale - width) / 2);
    return { x: Math.max(-mx, Math.min(mx, next.x)), y: Math.max(-my, Math.min(my, next.y)) };
  }
  function choose(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError("Elige una foto JPG o PNG de hasta 5 MB.");
      return;
    }
    setSource(URL.createObjectURL(file));
    setSize(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setError(null);
  }
  async function apply() {
    if (!source || !size || !frame.current || pending) return;
    setPending(true);
    setError(null);
    try {
      const image = new window.Image();
      image.src = source;
      await image.decode();
      const frameWidth = frame.current.getBoundingClientRect().width;
      const scale = Math.max(frameWidth / size.width, frameWidth / size.height) * zoom;
      const x = Math.max(0, -((frameWidth - size.width * scale) / 2 + offset.x) / scale);
      const y = Math.max(0, -((frameWidth - size.height * scale) / 2 + offset.y) / scale);
      const side = Math.min(frameWidth / scale, size.width - x, size.height - y);
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const context = canvas.getContext("2d");
      if (!context) throw new Error();
      context.drawImage(image, x, y, side, side, 0, 0, 512, 512);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9),
      );
      if (!blob) throw new Error();
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      setPreview(URL.createObjectURL(blob));
      setChanged(true);
      onChange(file, false);
      setSource(null);
    } catch {
      setError("No pudimos preparar la foto. Elige otra e inténtalo de nuevo.");
    } finally {
      setPending(false);
    }
  }
  const scale = size ? Math.max(width / size.width, width / size.height) * zoom : 1;
  return (
    <section className="border-pool-deep/70 overflow-hidden rounded-2xl border-2 bg-white">
      <h2 className="bg-pool-deep px-4 py-3 text-lg font-extrabold text-white">Foto de perfil</h2>
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-4">
          <Avatar
            name={name}
            src={preview}
            size={64}
            teamColor={teamColor}
            style={{ backgroundColor: "var(--pool-deep)" }}
          />
          <button
            type="button"
            className={`${shopPrimary} flex-1`}
            onClick={() => input.current?.click()}
          >
            <Camera aria-hidden="true" className="h-5 w-5" />
            {preview ? "Cambiar foto" : "Añadir foto"}
          </button>
        </div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          aria-label="Elegir foto de perfil"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            choose(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-pool-deep mr-auto text-sm font-medium">JPG o PNG · hasta 5 MB</p>
          {preview && (
            <button
              type="button"
              className={`${shopSecondary} border-red-800 bg-red-50 text-red-900`}
              onClick={() => {
                setPreview(null);
                setChanged(true);
                onChange(null, true);
              }}
            >
              Quitar foto
            </button>
          )}
          {changed && (
            <button
              type="button"
              className={shopSecondary}
              onClick={() => {
                setPreview(currentUrl);
                setChanged(false);
                onChange(null, false);
              }}
            >
              Deshacer
            </button>
          )}
        </div>
        {changed && (
          <p
            role="status"
            className="border-pool-deep/65 text-pool-deep rounded-lg border bg-blue-50 px-3 py-2 text-sm font-semibold"
          >
            {preview ? "Foto preparada para guardar" : "La foto se quitará al guardar"}
          </p>
        )}
        {error && !source && <ShopError>{error}</ShopError>}
      </div>
      <ActaGuardSheet
        open={Boolean(source)}
        onOpenChange={(open) => !open && setSource(null)}
        context="FOTO DE PERFIL"
        title="Ajustar foto"
        tall
        icon="saved"
        pending={pending}
        error={error}
        body={
          <div className="space-y-3">
            <div
              ref={frame}
              className="bg-pool-deep relative mx-auto aspect-square w-full max-w-64 touch-none overflow-hidden rounded-xl"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
              }}
              onPointerMove={(e) => {
                if (drag.current)
                  setOffset(
                    clamp({
                      x: drag.current.ox + e.clientX - drag.current.x,
                      y: drag.current.oy + e.clientY - drag.current.y,
                    }),
                  );
              }}
              onPointerUp={() => {
                drag.current = null;
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
            >
              {source && (
                <Image
                  src={source}
                  unoptimized
                  draggable={false}
                  width={size?.width ?? 512}
                  height={size?.height ?? 512}
                  alt="Encuadre de tu foto"
                  onLoad={(e) =>
                    setSize({
                      width: e.currentTarget.naturalWidth,
                      height: e.currentTarget.naturalHeight,
                    })
                  }
                  onError={() => {
                    setSize(null);
                    setError("No pudimos abrir esta imagen. Elige otra foto.");
                  }}
                  className="pointer-events-none absolute max-w-none"
                  style={{
                    width: size ? `${size.width * scale}px` : "100%",
                    height: size ? `${size.height * scale}px` : "100%",
                    left: `calc(50% + ${offset.x}px)`,
                    top: `calc(50% + ${offset.y}px)`,
                    transform: "translate(-50%,-50%)",
                  }}
                />
              )}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/90"
              />
            </div>
            <label className="text-pool-deep block font-extrabold" htmlFor="avatar-zoom">
              Acercar o alejar
            </label>
            <input
              id="avatar-zoom"
              className="accent-pool-blue min-h-12 w-full"
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => {
                const factor = Number(e.target.value);
                setZoom(factor);
                setOffset((v) => clamp(v, factor));
              }}
            />
            <div className="grid grid-cols-5 gap-1">
              {[
                { label: "Mover foto a la izquierda", x: -16, y: 0, icon: ArrowLeft },
                { label: "Mover foto arriba", x: 0, y: -16, icon: ArrowUp },
                { label: "Centrar foto", x: 0, y: 0, icon: RotateCcw },
                { label: "Mover foto abajo", x: 0, y: 16, icon: ArrowDown },
                { label: "Mover foto a la derecha", x: 16, y: 0, icon: ArrowRight },
              ].map(({ label, x, y, icon: Icon }) => (
                <button
                  type="button"
                  key={label}
                  aria-label={label}
                  className={`${shopSecondary} min-w-12 px-1`}
                  disabled={pending || !size}
                  onClick={() =>
                    setOffset((v) => clamp(x || y ? { x: v.x + x, y: v.y + y } : { x: 0, y: 0 }))
                  }
                >
                  <Icon aria-hidden="true" className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>
        }
        actions={[
          { label: "Usar esta foto", tone: "primary", disabled: !size, onClick: apply },
          { label: "Cancelar", tone: "secondary", onClick: () => setSource(null) },
        ]}
      />
    </section>
  );
}
