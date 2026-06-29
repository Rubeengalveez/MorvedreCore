import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, ShoppingCart, Tag, Layers } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getShopProduct } from "@/server/queries/shop";
import { formatCents, parseCartItem, parseProduct } from "@/lib/domain/shop";
import { Button } from "@/components/ui/button";
import { LanePattern } from "@/components/ui/lane-pattern";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CapTile } from "@/components/ui/cap-tile";
import { AddToCartButton } from "./_components/add-to-cart-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getShopProduct(id);
  if (!product) return { title: "Producto — Morvedre Core" };
  return { title: `${product.title} — Morvedre Core` };
}

export default async function ShopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const { id } = await params;
  const product = await getShopProduct(id);
  if (!product) notFound();

  const sizeOptions = product.sizes.length > 0 ? product.sizes : ["Única"];

  return (
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0" />
      <div className="relative z-[1] mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4">
        <Link
          href={"/shop" as Route}
          className="inline-flex items-center gap-1 text-xs font-bold text-pool-blue hover:underline"
        >
          <ArrowLeft className="h-3 w-3" />
          Tienda
        </Link>

        <div className="overflow-hidden rounded-md border border-ink-300 bg-paper-card shadow-elev-1">
          {product.image_url ? (
            <div className="aspect-square w-full overflow-hidden bg-pool-foam">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.image_url}
                alt={product.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-pool-deep/10 to-pool-teal/10">
              <CapTile number={1} teamColor="var(--pool-deep)" size="lg" />
            </div>
          )}

          <div className="flex flex-col gap-3 p-4">
            <div>
              <Eyebrow>{product.category}</Eyebrow>
              <h1 className="mt-0.5 break-words font-display text-2xl font-extrabold leading-tight text-pool-deep">
                {product.title}
              </h1>
            </div>
            <p className="font-mono text-3xl font-extrabold text-pool-deep">
              {formatCents(product.price_cents, product.currency)}
            </p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">
              {product.description}
            </p>
            {product.stock !== null ? (
              <p className="text-xs text-ink-600">
                Stock: {product.stock} unidades
              </p>
            ) : null}
            <AddToCartButton
              productId={product.id}
              available={product.available}
              maxPerOrder={product.max_per_order}
              sizes={sizeOptions}
            />
            {!product.available ? (
              <p className="rounded-md border border-ink-300 bg-paper p-2 text-center text-xs font-bold text-ink-600">
                No disponible
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

void parseProduct;
void parseCartItem;
void ShoppingCart;
void Tag;
void Layers;
void Button;
