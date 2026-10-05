"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { ArrowLeft, ChevronRight, Save, Trash2 } from "lucide-react";
import { ShopDecisionSheet } from "./shop-decision-sheet";
import { ShopPhotoEditor, type ShopPhoto } from "./shop-photo-editor";
import { SHOP_PRODUCT_TYPES, shopProductType } from "@/lib/domain/shop-catalog";
import { useActaBackGuard } from "@/components/matches/use-acta-back-guard";
import {
  createShopProduct,
  deleteShopProduct,
  updateShopProduct,
} from "@/server/actions/admin/shop";
import { validateImageFile } from "@/lib/uploads/images";
import { parseProduct } from "@/lib/domain/shop";
import { shopMoney } from "@/lib/domain/shop-management";
import {
  ShopSection,
  ShopField,
  ShopError,
  shopControl,
  shopPrimary,
  shopSecondary,
} from "./shop-ui";

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
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ShopEditorFormInitial>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    category: shopProductType(initial?.category),
    price_eur: initial?.price_eur ?? 0,
    currency: "EUR",
    image_url: initial?.image_url ?? null,
    sizes: initial?.sizes ?? [],
    available: initial?.available ?? true,
    personalization_enabled: initial?.personalization_enabled ?? false,
    personalization_label: "Nombre",
    personalization_max_length: initial?.personalization_max_length ?? 30,
  });
  const [price, setPrice] = useState(initial ? String(initial.price_eur) : "");
  const [customSize, setCustomSize] = useState("");
  const [dirty, setDirty] = useState(false);
  const [photos, setPhotos] = useState<ShopPhoto[]>(() =>
    (initial?.images ?? [])
      .toSorted((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order)
      .map((image) => ({ key: image.id, id: image.id, url: image.url })),
  );
  const [sizeMode, setSizeMode] = useState<"none" | "one" | "sizes">(
    initial?.sizes.length
      ? initial.sizes.length === 1 && /^(única|unica|talla única)$/i.test(initial.sizes[0])
        ? "one"
        : "sizes"
      : "none",
  );
  const objectUrls = useRef(new Set<string>());
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"leave" | "delete" | "save" | null>(null);
  const [pending, startTransition] = useTransition();
  const [validatingImages, setValidatingImages] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const allowExit = useRef(false);
  const exit = useActaBackGuard(() => setConfirm("leave"), dirty && !pending);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!allowExit.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  function update<K extends keyof ShopEditorFormInitial>(key: K, value: ShopEditorFormInitial[K]) {
    setDirty(true);
    setForm((previous) => ({ ...previous, [key]: value }));
  }
  function leave() {
    if (dirty) setConfirm("leave");
    else exit("/admin/shop?view=products");
  }
  function finishExit() {
    allowExit.current = true;
    exit("/admin/shop?view=products");
  }
  function go(next: number) {
    setError(null);
    setStep(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  useEffect(() => {
    stepHeading.current?.focus();
  }, [step]);
  function advance() {
    const parsed = parseProduct({ ...form, price_eur: Number(price.replace(",", ".")) });
    if (step === 1 && sizeMode === "sizes" && !form.sizes.length) {
      setError("Elige al menos una talla o cambia a Sin talla.");
      return;
    }
    if (!parsed.ok) {
      setError(parsed.error ?? "Revisa los datos del producto.");
      return;
    }
    go(step + 1);
  }
  function addSize() {
    const size = customSize.trim();
    if (!size) return;
    if (size.length > 15) {
      setError("Usa una talla de hasta 15 caracteres.");
      return;
    }
    if (!form.sizes.some((value) => value.toLowerCase() === size.toLowerCase()))
      update("sizes", [...form.sizes, size]);
    setCustomSize("");
  }
  async function pickFiles(next: File[]) {
    setError(null);
    setValidatingImages(true);
    try {
      if (photos.length + next.length > 8)
        throw new Error(`Puedes añadir ${8 - photos.length} fotos más. El máximo es 8.`);
      for (const file of next) await validateImageFile(file);
      const added = next.map((file) => {
        const url = URL.createObjectURL(file);
        objectUrls.current.add(url);
        return { key: crypto.randomUUID(), url, file };
      });
      setPhotos((previous) => [...previous, ...added]);
      setDirty(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos abrir las fotos.");
    } finally {
      setValidatingImages(false);
    }
  }
  function changePhotos(next: ShopPhoto[]) {
    for (const photo of photos) {
      if (photo.file && !next.some((item) => item.key === photo.key)) {
        URL.revokeObjectURL(photo.url);
        objectUrls.current.delete(photo.url);
      }
    }
    setPhotos(next);
    setDirty(true);
  }
  function save() {
    setError(null);
    const value = {
      ...form,
      price_eur: Number(price.replace(",", ".")),
      imageFiles: photos.flatMap((photo) => (photo.file ? [photo.file] : [])),
      galleryOrder: photos.map((photo) =>
        photo.file
          ? {
              fileIndex: photos
                .filter((item) => item.file)
                .findIndex((item) => item.key === photo.key),
            }
          : { imageId: photo.id! },
      ),
    };
    const parsed = parseProduct(value);
    if (!parsed.ok) {
      setError(parsed.error ?? "Revisa los datos.");
      return;
    }
    startTransition(async () => {
      try {
        if (mode === "create") await createShopProduct(value);
        else await updateShopProduct({ ...value, product_id: productId! });
        finishExit();
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "No pudimos guardar. Tus cambios siguen aquí.",
        );
      }
    });
  }
  function remove() {
    startTransition(async () => {
      try {
        await deleteShopProduct({ product_id: productId! });
        finishExit();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No pudimos eliminarlo.");
      }
    });
  }
  return (
    <div className="text-pool-deep space-y-4">
      <button
        type="button"
        className="text-pool-blue focus-visible:outline-pool-deep inline-flex min-h-12 items-center gap-2 font-bold focus-visible:outline-2"
        onClick={leave}
        disabled={pending}
      >
        <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        Volver a productos
      </button>
      <header className="border-pool-deep/70 rounded-2xl border-2 bg-white p-4">
        <p className="text-pool-blue text-sm font-bold">
          Tienda · {mode === "create" ? "Nuevo producto" : "Editar producto"}
        </p>
        <h1 ref={stepHeading} tabIndex={-1} className="mt-1 text-2xl font-extrabold outline-none">
          {["Datos del producto", "Fotos y tallas", "Revisa y guarda"][step]}
        </h1>
      </header>
      <nav aria-label="Pasos del producto" className="grid grid-cols-3 gap-2">
        {["Producto", "Opciones", "Revisar"].map((label, index) => (
          <button
            type="button"
            key={label}
            disabled={index > step || pending || validatingImages}
            onClick={() => go(index)}
            aria-current={step === index ? "step" : undefined}
            className={`${shopSecondary} !gap-1 !px-1 ${index === step ? "!bg-pool-deep !text-white" : ""}`}
          >
            <span className="font-extrabold">{index + 1}.</span>
            {label}
          </button>
        ))}
      </nav>
      {error && (
        <div ref={errorRef} tabIndex={-1}>
          <ShopError>{error}</ShopError>
        </div>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (step < 2) advance();
          else setConfirm("save");
        }}
        className="space-y-4"
        aria-busy={pending || validatingImages}
      >
        <fieldset disabled={pending || validatingImages} className="min-w-0 space-y-4">
          {step === 0 && (
            <ShopSection title="¿Qué vas a añadir?">
              <ShopField label="Nombre del producto" htmlFor="product-title">
                <input
                  id="product-title"
                  required
                  minLength={3}
                  maxLength={80}
                  className={shopControl}
                  value={form.title}
                  onChange={(event) => update("title", event.target.value)}
                  placeholder="Ej. Sudadera del club"
                  autoComplete="off"
                />
              </ShopField>
              <ShopField label="Tipo de producto" htmlFor="product-category">
                <select
                  id="product-category"
                  className={shopControl}
                  value={form.category}
                  onChange={(event) => update("category", event.target.value)}
                >
                  {SHOP_PRODUCT_TYPES.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </ShopField>
              <ShopField label="Precio (€)" htmlFor="product-price">
                <input
                  id="product-price"
                  type="text"
                  inputMode="decimal"
                  required
                  className={shopControl}
                  value={price}
                  onChange={(event) => {
                    setPrice(event.target.value);
                    setDirty(true);
                  }}
                  placeholder="Ej. 25,00"
                />
              </ShopField>
              <ShopField label="Descripción" htmlFor="product-description">
                <textarea
                  id="product-description"
                  required
                  maxLength={2000}
                  rows={3}
                  className={`${shopControl} py-3`}
                  value={form.description}
                  onChange={(event) => update("description", event.target.value)}
                  placeholder="Ej. Sudadera azul con el escudo del club."
                />
              </ShopField>
            </ShopSection>
          )}
          {step === 1 && (
            <>
              <ShopSection title="Fotos del producto">
                <ShopPhotoEditor
                  photos={photos}
                  onChange={changePhotos}
                  onAdd={pickFiles}
                  disabled={pending || validatingImages}
                />
              </ShopSection>
              <ShopSection title="Tallas disponibles">
                <ShopField label="¿Este producto tiene tallas?" htmlFor="size-mode">
                  <select
                    id="size-mode"
                    className={shopControl}
                    value={sizeMode}
                    onChange={(event) => {
                      const value = event.target.value as typeof sizeMode;
                      setSizeMode(value);
                      update("sizes", value === "none" ? [] : value === "one" ? ["Única"] : []);
                    }}
                  >
                    <option value="none">Sin talla</option>
                    <option value="one">Talla única</option>
                    <option value="sizes">Elegir tallas</option>
                  </select>
                </ShopField>
                {sizeMode === "sizes" && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {[...new Set(["XS", "S", "M", "L", "XL", "XXL", ...form.sizes])].map(
                        (size) => (
                          <button
                            type="button"
                            key={size}
                            aria-pressed={form.sizes.includes(size)}
                            className={`${shopSecondary} min-w-12 ${form.sizes.includes(size) ? "!bg-pool-deep !text-white" : ""}`}
                            onClick={() =>
                              update(
                                "sizes",
                                form.sizes.includes(size)
                                  ? form.sizes.filter((value) => value !== size)
                                  : [...form.sizes, size],
                              )
                            }
                          >
                            {size}
                          </button>
                        ),
                      )}
                    </div>
                    <ShopField label="Otra talla" htmlFor="custom-size">
                      <div className="flex gap-2">
                        <input
                          id="custom-size"
                          className={`${shopControl} min-w-0`}
                          value={customSize}
                          maxLength={15}
                          onChange={(event) => setCustomSize(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addSize();
                            }
                          }}
                          placeholder="Ej. 12 o talla única"
                        />
                        <button
                          type="button"
                          className={shopSecondary}
                          onClick={addSize}
                          disabled={!customSize.trim()}
                        >
                          Añadir
                        </button>
                      </div>
                    </ShopField>
                  </>
                )}
                <p className="text-sm font-semibold">
                  {form.sizes.length
                    ? `Tallas: ${form.sizes.join(" · ")}`
                    : "Sin talla: quien compre no tendrá que elegir una."}
                </p>
              </ShopSection>
              <ShopSection title="Nombre personalizado">
                <label className="border-pool-deep/65 flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 p-3 font-bold">
                  <input
                    type="checkbox"
                    className="accent-pool-deep h-6 w-6"
                    checked={form.personalization_enabled}
                    onChange={(event) => update("personalization_enabled", event.target.checked)}
                  />
                  Permitir poner un nombre
                </label>
              </ShopSection>
            </>
          )}
          {step === 2 && (
            <>
              <ShopSection title="Así quedará el producto">
                <div>
                  <h3 className="text-xl font-extrabold break-words">{form.title}</h3>
                  <p className="mt-1 text-lg font-extrabold">
                    {shopMoney(Math.round(Number(price.replace(",", ".")) * 100))}
                  </p>
                  <p className="mt-3 break-words whitespace-pre-wrap">{form.description}</p>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3">
                  <dt className="font-bold">Tipo</dt>
                  <dd>{form.category}</dd>
                  <dt className="font-bold">Tallas</dt>
                  <dd className="break-words">{form.sizes.join(" · ") || "Sin talla"}</dd>
                  <dt className="font-bold">Nombre</dt>
                  <dd>{form.personalization_enabled ? "Personalizable" : "Sin personalizar"}</dd>
                  <dt className="font-bold">Fotos</dt>
                  <dd>{photos.length}</dd>
                </dl>
                <button type="button" className={`${shopSecondary} w-full`} onClick={() => go(0)}>
                  Cambiar datos
                </button>
              </ShopSection>
              <ShopSection title="Visibilidad en la tienda">
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      [true, "Publicado"],
                      [false, "Oculto"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      type="button"
                      key={label}
                      aria-pressed={form.available === value}
                      className={`${shopSecondary} ${form.available === value ? "!bg-pool-deep !text-white" : ""}`}
                      onClick={() => update("available", value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </ShopSection>
            </>
          )}
        </fieldset>
        <div className="border-pool-deep/70 sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-10 flex gap-2 rounded-2xl border-2 bg-white p-3 shadow-lg">
          {step > 0 && (
            <button
              type="button"
              className={shopSecondary}
              onClick={() => go(step - 1)}
              disabled={pending || validatingImages}
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">Paso anterior</span>
            </button>
          )}
          <button
            type="submit"
            disabled={pending || validatingImages}
            className={`${shopPrimary} flex-1`}
          >
            {pending ? "Guardando…" : step === 2 ? "Guardar producto" : "Continuar"}
            {step === 2 ? (
              <Save aria-hidden="true" className="h-5 w-5" />
            ) : (
              <ChevronRight aria-hidden="true" className="h-5 w-5" />
            )}
          </button>
        </div>
        {mode === "edit" && step === 2 && (
          <button
            type="button"
            className={`${shopSecondary} w-full !border-red-800 !text-red-900`}
            onClick={() => {
              setError(null);
              setConfirm("delete");
            }}
            disabled={pending}
          >
            <Trash2 aria-hidden="true" className="h-5 w-5" />
            Eliminar producto
          </button>
        )}
      </form>
      <ShopDecisionSheet
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={
          confirm === "save"
            ? "¿Guardar este producto?"
            : confirm === "delete"
              ? "¿Eliminar este producto?"
              : "¿Salir sin guardar?"
        }
        summary={form.title || "Producto sin guardar"}
        description={
          confirm === "save"
            ? form.available
              ? "Aparecerá en la tienda con estos datos y fotos."
              : "Se guardará como oculto. Podrás publicarlo cuando quieras."
            : confirm === "delete"
              ? "Esta acción no se puede deshacer. Si tiene pedidos, tendrás que ocultarlo."
              : "Los cambios que has hecho no se guardarán."
        }
        icon={confirm === "save" ? "saved" : "warning"}
        pending={pending}
        error={error}
        actions={[
          {
            label:
              confirm === "save"
                ? "Guardar producto"
                : confirm === "delete"
                  ? "Eliminar producto"
                  : "Salir sin guardar",
            tone: confirm === "save" ? "primary" : "danger",
            onClick: confirm === "save" ? save : confirm === "delete" ? remove : finishExit,
          },
          { label: "Seguir editando", tone: "secondary", onClick: () => setConfirm(null) },
        ]}
      />
    </div>
  );
}
