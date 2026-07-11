"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import {
  createShopProduct,
  deleteShopProduct,
  updateShopProduct,
} from "@/server/actions/admin/shop";

export interface ShopEditorFormInitial {
  title: string;
  description: string;
  category: string;
  price_eur: number;
  currency: string;
  image_url: string | null;
  images?: Array<{ id: string; url: string; is_cover: boolean; sort_order: number }>;
  sizes: string[];
  available: boolean;
  stock: number | null;
  max_per_order: number;
  personalization_enabled: boolean;
  personalization_label: string;
  personalization_max_length: number;
}

export interface ShopEditorFormProps {
  mode: "create" | "edit";
  productId?: string;
  initial?: ShopEditorFormInitial;
}

export function ShopEditorForm({ mode, productId, initial }: ShopEditorFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [coverImageIndex, setCoverImageIndex] = useState(0);
  const [sizesText, setSizesText] = useState((initial?.sizes ?? []).join(", "));

  const [form, setForm] = useState<ShopEditorFormInitial>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    category: initial?.category ?? "",
    price_eur: initial?.price_eur ?? 0,
    currency: initial?.currency ?? "EUR",
    image_url: initial?.image_url ?? null,
    sizes: initial?.sizes ?? [],
    available: initial?.available ?? true,
    stock: initial?.stock ?? null,
    max_per_order: initial?.max_per_order ?? 1,
    personalization_enabled: initial?.personalization_enabled ?? false,
    personalization_label: initial?.personalization_label ?? "Nombre",
    personalization_max_length: initial?.personalization_max_length ?? 30,
  });

  function update<K extends keyof ShopEditorFormInitial>(key: K, value: ShopEditorFormInitial[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const previews = useMemo(() => imageFiles.map((file) => URL.createObjectURL(file)), [imageFiles]);

  useEffect(() => {
    return () => {
      for (const url of previews) URL.revokeObjectURL(url);
    };
  }, [previews]);

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const sizesClean = sizesText
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        if (mode === "create") {
          await createShopProduct({
            title: form.title,
            description: form.description,
            category: form.category,
            price_eur: form.price_eur,
            image_url: form.image_url,
            sizes: sizesClean,
            available: form.available,
            stock: form.stock,
            max_per_order: form.max_per_order,
            personalization_enabled: form.personalization_enabled,
            personalization_label: form.personalization_label,
            personalization_max_length: form.personalization_max_length,
            imageFiles,
            coverImageIndex,
          });
        } else {
          await updateShopProduct({
            product_id: productId!,
            title: form.title,
            description: form.description,
            category: form.category,
            price_eur: form.price_eur,
            image_url: form.image_url,
            sizes: sizesClean,
            available: form.available,
            stock: form.stock,
            max_per_order: form.max_per_order,
            personalization_enabled: form.personalization_enabled,
            personalization_label: form.personalization_label,
            personalization_max_length: form.personalization_max_length,
            imageFiles,
            coverImageIndex,
          });
        }
        router.push("/admin/shop" as never);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ha habido un problema.");
      }
    });
  }

  function remove() {
    if (!productId) return;
    if (!confirm("¿Eliminar este producto? No se puede deshacer.")) return;
    startTransition(async () => {
      try {
        await deleteShopProduct({ product_id: productId });
        router.push("/admin/shop" as never);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ha habido un problema.");
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="border-ink-300 bg-paper-card shadow-elev-1 flex flex-col gap-3 rounded-md border p-4"
    >
      <Field label="Título">
        <Input value={form.title} onChange={(e) => update("title", e.target.value)} required />
      </Field>
      <Field label="Categoría">
        <Input
          value={form.category}
          onChange={(e) => update("category", e.target.value)}
          placeholder="Equipación, Complementos, Regalos…"
          required
        />
      </Field>
      <Field label="Descripción">
        <textarea
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={4}
          className="border-ink-300 bg-paper text-pool-deep focus-visible:ring-pool-blue min-h-[100px] w-full rounded border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
          required
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Precio (€)">
          <Input
            type="number"
            min={0.01}
            step="0.01"
            value={form.price_eur}
            onChange={(e) => update("price_eur", Number(e.target.value))}
            required
          />
        </Field>
        <Field label="Máx por pedido">
          <Input
            type="number"
            min={1}
            max={20}
            value={form.max_per_order}
            onChange={(e) => update("max_per_order", Number(e.target.value))}
            required
          />
        </Field>
      </div>
      <Field label="Tallas (separadas por coma, vacío si única)">
        <Input
          value={sizesText}
          onChange={(e) => {
            setSizesText(e.target.value);
            update(
              "sizes",
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter((s) => s.length > 0),
            );
          }}
          placeholder="XS, S, M, L, XL"
        />
      </Field>
      <div className="border-ink-300 bg-paper flex flex-col gap-3 rounded-xl border p-4">
        <label className="text-pool-deep flex min-h-12 cursor-pointer items-center justify-between gap-4 text-sm font-extrabold">
          <span>
            Permitir personalización
            <span className="text-ink-600 mt-0.5 block text-xs font-medium">
              El usuario deberá escribirla antes de añadir el producto.
            </span>
          </span>
          <input
            type="checkbox"
            checked={form.personalization_enabled}
            onChange={(event) => update("personalization_enabled", event.target.checked)}
            className="accent-pool-blue h-5 w-5 shrink-0"
          />
        </label>
        {form.personalization_enabled ? (
          <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
            <Field label="Qué debe escribir">
              <Input
                value={form.personalization_label}
                onChange={(event) => update("personalization_label", event.target.value)}
                placeholder="Nombre"
                maxLength={40}
                required
              />
            </Field>
            <Field label="Máximo">
              <Input
                type="number"
                min={1}
                max={60}
                value={form.personalization_max_length}
                onChange={(event) =>
                  update("personalization_max_length", Number(event.target.value))
                }
                required
              />
            </Field>
          </div>
        ) : null}
      </div>
      <Field label="Stock (vacío para ilimitado)">
        <Input
          type="number"
          min={0}
          max={1000}
          value={form.stock ?? ""}
          onChange={(e) => update("stock", e.target.value === "" ? null : Number(e.target.value))}
        />
      </Field>
      <Field label="Fotos del producto">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []).slice(0, 8);
            setImageFiles(files);
            setCoverImageIndex(0);
          }}
          className="hidden"
        />
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="border-ink-300 bg-paper text-pool-deep hover:bg-pool-foam inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border px-3 text-sm font-extrabold"
          >
            <Upload className="h-4 w-4" />
            {imageFiles.length > 0
              ? `${imageFiles.length} foto${imageFiles.length === 1 ? "" : "s"} seleccionada${imageFiles.length === 1 ? "" : "s"}`
              : "Subir fotos"}
          </button>
          {previews.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {previews.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setCoverImageIndex(index)}
                  className={cn(
                    "bg-paper-sunk relative aspect-square overflow-hidden rounded-md border",
                    coverImageIndex === index
                      ? "border-action ring-action/25 ring-2"
                      : "border-ink-300",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  {coverImageIndex === index ? (
                    <span className="bg-action text-paper absolute inset-x-1 bottom-1 rounded-sm px-1 py-0.5 text-xs font-extrabold uppercase">
                      Portada
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : initial?.images?.length ? (
            <div className="grid grid-cols-4 gap-2">
              {initial.images
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((image) => (
                  <div
                    key={image.id}
                    className="border-ink-300 bg-paper-sunk relative aspect-square overflow-hidden rounded-md border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt="" className="h-full w-full object-cover" />
                    {image.is_cover ? (
                      <span className="bg-pool-deep text-paper absolute inset-x-1 bottom-1 rounded-sm px-1 py-0.5 text-center text-xs font-extrabold uppercase">
                        Portada
                      </span>
                    ) : null}
                  </div>
                ))}
            </div>
          ) : form.image_url ? (
            <div className="border-ink-300 bg-paper flex items-center gap-2 rounded-md border p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={form.image_url} alt="" className="h-12 w-12 rounded object-cover" />
              <span className="text-ink-700 min-w-0 flex-1 text-sm font-semibold">
                Imagen actual
              </span>
              <button
                type="button"
                onClick={() => {
                  update("image_url", null);
                  setImageFiles([]);
                }}
                className="text-ink-600 hover:bg-paper-sunk inline-flex h-9 w-9 items-center justify-center rounded-md"
                aria-label="Quitar imagen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          <p className="text-ink-600 text-xs leading-snug font-medium">
            Puedes subir hasta 8 fotos. Toca una foto seleccionada para marcarla como portada.
          </p>
        </div>
      </Field>
      <label
        className={cn(
          "border-ink-300 bg-paper text-pool-deep flex items-center gap-2 rounded-md border p-2 text-sm",
        )}
      >
        <input
          type="checkbox"
          checked={form.available}
          onChange={(e) => update("available", e.target.checked)}
          className="h-4 w-4"
        />
        Disponible
      </label>
      {error ? (
        <div
          role="alert"
          className="border-goggle-red/30 bg-goggle-red/5 text-goggle-red rounded border px-3 py-2 text-xs font-bold"
        >
          {error}
        </div>
      ) : null}
      <div className="border-ink-300 flex items-center justify-between gap-2 border-t pt-3">
        {mode === "edit" ? (
          <Button
            type="button"
            variant="ghost"
            onClick={remove}
            disabled={pending}
            className="text-goggle-red"
          >
            <Trash2 className="h-4 w-4" /> Eliminar
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" variant="primary" disabled={pending}>
          <Save className="h-4 w-4" /> {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-eyebrow text-ink-700">{label}</span>
      {children}
    </label>
  );
}
