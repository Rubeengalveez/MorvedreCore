import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { createClient } from "@/lib/supabase/server";
import { getShopProduct } from "@/server/queries/shop";
import { LanePattern } from "@/components/ui/lane-pattern";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ShopEditorForm } from "../../../_components/shop-editor-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Editar producto — Morvedre Core",
};

async function isAdmin(profileId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", profileId)
    .eq("role", "admin")
    .is("scope_team_id", null)
    .maybeSingle();
  return !!data;
}

export default async function EditShopProductPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  if (!(await isAdmin(ctx.activeProfile.id))) redirect("/dashboard");
  const { id } = await params;
  const product = await getShopProduct(id);
  if (!product) notFound();

  return (
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0" />
      <div className="relative z-[1] mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4">
        <Link
          href={"/admin/shop" as Route}
          className="text-pool-blue inline-flex items-center gap-1 text-xs font-bold hover:underline"
        >
          <ArrowLeft className="h-3 w-3" />
          Kanban
        </Link>
        <header>
          <Eyebrow>Editar producto</Eyebrow>
          <h1 className="font-display text-pool-deep text-2xl font-extrabold">{product.title}</h1>
        </header>
        <ShopEditorForm
          mode="edit"
          productId={product.id}
          initial={{
            title: product.title,
            description: product.description,
            category: product.category,
            price_eur: product.price_cents / 100,
            currency: product.currency,
            image_url: product.image_url,
            images: product.images.map((image) => ({
              id: image.id,
              url: image.url,
              is_cover: image.is_cover,
              sort_order: image.sort_order,
            })),
            sizes: product.sizes,
            available: product.available,
            stock: product.stock,
            max_per_order: product.max_per_order,
          }}
        />
      </div>
    </div>
  );
}
