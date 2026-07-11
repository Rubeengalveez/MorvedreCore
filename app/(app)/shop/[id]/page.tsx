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

  const personalized = /personaliz|nombre|iniciales/i.test(
    `${product.title} ${product.description}`,
  );

  return (
    <PageShell width="lg" className="gap-5 pb-8">
      <Link
        href={"/shop" as Route}
        className="text-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue -ml-2 inline-flex min-h-11 w-fit touch-manipulation items-center gap-2 rounded-xl px-2 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver a la tienda
      </Link>

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

        <div className="flex min-w-0 flex-col gap-5 md:sticky md:top-[calc(var(--top-bar-height)+1rem)]">
          <section className="border-ink-200 bg-paper-card shadow-elev-2 rounded-[1.75rem] border p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-pool-blue text-xs font-extrabold tracking-[0.12em] uppercase">
                {product.category}
              </p>
              <span
                className={
                  product.available
                    ? "bg-success/10 text-success rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase"
                    : "bg-goggle-red/10 text-goggle-red rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase"
                }
              >
                {product.available ? "Disponible" : "Agotado"}
              </span>
            </div>
            <h1 className="font-display text-pool-deep mt-3 text-3xl leading-tight font-extrabold tracking-tight text-balance">
              {product.title}
            </h1>
            <p className="text-pool-deep mt-5 font-mono text-3xl font-extrabold tabular-nums">
              {formatCents(product.price_cents, product.currency)}
            </p>
            <p className="text-ink-500 mt-2 text-sm font-semibold">
              {product.stock !== null
                ? product.stock > 0
                  ? `${product.stock} disponibles`
                  : "Sin stock"
                : "Disponible bajo pedido"}
            </p>

            <div className="border-ink-200 mt-5 grid grid-cols-2 border-y py-4">
              <TrustLine icon={ShieldCheck} title="Compra del club" text="Sin comisiones" />
              <TrustLine
                icon={PackageCheck}
                title="Entrega coordinada"
                text="Recogida en el club"
              />
            </div>

            <section aria-labelledby="product-description-heading" className="mt-5">
              <h2
                id="product-description-heading"
                className="font-display text-pool-deep text-lg font-extrabold"
              >
                Detalles
              </h2>
              <p className="text-ink-700 mt-2 text-base leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </section>
          </section>

          <AddToCartButton
            productId={product.id}
            available={product.available}
            sizes={product.sizes}
            personalized={personalized}
          />

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
