"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2, Upload, X } from "lucide-react";
import Image from "next/image";

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
  sizes: string[];
  available: boolean;
  stock: number | null;
  max_per_order: number;
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
  const [imageFile, setImageFile] = useState<File | null>(null);
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
    max_per_order: initial?.max_per_order ?? 10,
  });

  function update<K extends keyof ShopEditorFormInitial>(
    key: K,
    value: ShopEditorFormInitial[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

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
            imageFile,
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
            imageFile,
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
      className="flex flex-col gap-3 rounded-md border border-ink-300 bg-paper-card p-4 shadow-elev-1"
    >
      <Field label="Título">
        <Input
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
          required
        />
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
          className="min-h-[100px] w-full rounded border border-ink-300 bg-paper px-3 py-2 text-sm text-pool-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue"
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
      <Field label="Stock (vacío para ilimitado)">
        <Input
          type="number"
          min={0}
          max={1000}
          value={form.stock ?? ""}
          onChange={(e) =>
            update("stock", e.target.value === "" ? null : Number(e.target.value))
          }
        />
      </Field>
      <Field label="Imagen">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-9 items-center gap-1.5 rounded border border-ink-300 bg-paper px-3 text-xs font-bold text-pool-deep hover:bg-pool-foam"
          >
            <Upload className="h-3.5 w-3.5" />
            {imageFile ? imageFile.name : "Subir imagen"}
          </button>
          {form.image_url ? (
            <div className="flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.image_url}
                alt="preview"
                className="h-9 w-9 rounded object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  update("image_url", null);
                  setImageFile(null);
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded text-ink-600 hover:bg-paper-sunk"
                aria-label="Quitar imagen"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : null}
        </div>
      </Field>
      <label
        className={cn(
          "flex items-center gap-2 rounded-md border border-ink-300 bg-paper p-2 text-sm text-pool-deep",
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
          className="rounded border border-goggle-red/30 bg-goggle-red/5 px-3 py-2 text-xs font-bold text-goggle-red"
        >
          {error}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2 border-t border-ink-300 pt-3">
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-eyebrow text-ink-700">{label}</span>
      {children}
    </label>
  );
}

void Image;
