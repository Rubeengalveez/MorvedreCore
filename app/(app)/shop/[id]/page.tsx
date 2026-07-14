import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, PackageCheck, ShieldCheck } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getShopProduct } from "@/server/queries/shop";
import { formatCents } from "@/lib/domain/shop";
import { PageShell } from "@/components/ui/page-shell";
import { AddToCartButton } from "./_components/add-to-cart-button";
import { ProductGallery } from "./_components/product-gallery";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getShopProduct(id);
  if (!product) return { title: "Producto — Morvedre Core" };
  return { title: `${product.title} — Morvedre Core` };
}

export default async function ShopDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const { id } = await params;
  const product = await getShopProduct(id);
  if (!product) notFound();

  return (
    <PageShell width="lg" className="gap-5 pb-8">
      <Link
        href={"/shop" as Route}
        className="text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue -ml-2 inline-flex min-h-11 w-fit touch-manipulation items-center gap-2 rounded-xl px-2 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver a la tienda
      </Link>

      <header className="border-ink-300 border-b pb-5">
        <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">
          {product.category}
        </p>
        <h1 className="text-pool-deep mt-2 text-2xl leading-tight font-extrabold tracking-tight text-balance sm:text-3xl">
          {product.title}
        </h1>
        <p className="font-display text-pool-deep mt-3 text-4xl leading-none font-extrabold tracking-tight tabular-nums sm:text-5xl">
          {formatCents(product.price_cents, product.currency)}
        </p>
        <p className="text-ink-500 mt-2 text-sm font-semibold">Se prepara bajo pedido</p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] md:items-start md:gap-8">
        <ProductGallery
          title={product.title}
          images={product.images.map((image) => ({
            id: image.id,
            url: image.url,
            alt: image.alt,
            is_cover: image.is_cover,
          }))}
        />

        <div className="flex min-w-0 flex-col gap-4 md:sticky md:top-[calc(var(--top-bar-height)+1rem)]">
          <section className="border-ink-300 bg-paper-card rounded-xl border p-4 shadow-sm sm:p-5">
            <AddToCartButton
              productId={product.id}
              available={product.available}
              sizes={product.sizes}
              personalizationEnabled={product.personalization_enabled}
              personalizationLabel={product.personalization_label}
              personalizationMaxLength={product.personalization_max_length}
            />
          </section>

          <section className="border-ink-300 bg-paper-card rounded-xl border p-4 sm:p-5">
            <h2 className="font-display text-pool-deep text-lg font-extrabold">Detalles</h2>
            <p className="text-ink-700 mt-2 text-base leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
            <div className="border-ink-200 mt-5 grid grid-cols-2 border-t pt-4">
              <TrustLine icon={ShieldCheck} title="Compra del club" text="Sin comisiones" />
              <TrustLine
                icon={PackageCheck}
                title="Entrega coordinada"
                text="Recogida en el club"
              />
            </div>
          </section>

          {!product.available ? (
            <p className="border-ink-200 bg-paper-card text-ink-600 rounded-2xl border p-4 text-center text-base font-semibold">
              Este producto no está disponible ahora mismo.
            </p>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}

function TrustLine({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof ShieldCheck;
  title: string;
  text: string;
}) {
  return (
    <div className="flex min-w-0 gap-2 px-2 first:pl-0 last:pr-0">
      <Icon className="text-pool-blue mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-pool-deep text-sm font-extrabold">{title}</p>
        <p className="text-ink-500 mt-0.5 text-xs">{text}</p>
      </div>
    </div>
  );
}
