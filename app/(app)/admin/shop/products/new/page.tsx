import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { createClient } from "@/lib/supabase/server";
import { LanePattern } from "@/components/ui/lane-pattern";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ShopEditorForm } from "../../_components/shop-editor-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Nuevo producto — Morvedre Core",
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

export default async function NewShopProductPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  if (!(await isAdmin(ctx.activeProfile.id))) redirect("/dashboard");

  return (
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0" />
      <div className="relative z-[1] mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4">
        <Link
          href={"/admin/shop" as Route}
          className="inline-flex items-center gap-1 text-xs font-bold text-pool-blue hover:underline"
        >
          <ArrowLeft className="h-3 w-3" />
          Kanban
        </Link>
        <header>
          <Eyebrow>Nuevo producto</Eyebrow>
          <h1 className="font-display text-2xl font-extrabold text-pool-deep">
            Crear producto
          </h1>
        </header>
        <ShopEditorForm mode="create" />
      </div>
    </div>
  );
}
