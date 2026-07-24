import { redirect, notFound } from "next/navigation";
import { MessageCircle, PackageCheck, ShieldCheck } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { getShopProduct } from "@/server/queries/shop";
import { formatCents } from "@/lib/domain/shop";
import { PageBackLink } from "@/components/ui/page-back-link";
import { PageShell } from "@/components/ui/page-shell";
import { AddToCartButton } from "./_components/add-to-cart-button";
import { ProductGallery } from "./_components/product-gallery";
import { FloatingCartButton } from "../_components/floating-cart-button";

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
  const whatsappMessage = encodeURIComponent(
    `Hola Sol, vengo de la tienda de Morvedre Core y me gustaría tener más información sobre “${product.title}”. Gracias.`,
  );
  const whatsappUrl = `https://wa.me/34655111532?text=${whatsappMessage}`;

  return (
    <PageShell width="lg" className="gap-4 pb-8">
      <FloatingCartButton profileId={ctx.ownProfile.id} />
      <PageBackLink href="/shop">Volver a la tienda</PageBackLink>

      <header className="px-0.5 pb-1">
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
              profileId={ctx.ownProfile.id}
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

          <section className="border-success/25 bg-success/10 rounded-2xl border p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="bg-success/12 text-success flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-pool-deep text-lg font-extrabold">
                  ¿Tienes alguna duda?
                </h2>
                <p className="text-ink-600 mt-1 text-sm leading-relaxed font-semibold">
                  Pregunta directamente a Sol, la encargada de la equipación.
                </p>
              </div>
            </div>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-success text-paper hover:bg-success/90 focus-visible:ring-success mt-4 inline-flex min-h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-xl px-4 text-base font-extrabold transition-[background-color,transform] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98] motion-reduce:transition-none"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              Preguntar a Sol por WhatsApp
            </a>
          </section>
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
