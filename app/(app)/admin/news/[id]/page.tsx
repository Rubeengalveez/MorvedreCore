import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, Megaphone } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { createClient } from "@/lib/supabase/server";
import { getNewsPost } from "@/server/queries/news";
import { deleteNewsPost, togglePinNews, updateNewsPost } from "@/server/actions/admin/news";
import { LanePattern } from "@/components/ui/lane-pattern";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import { NewsEditor, type TeamOption } from "@/components/news/news-editor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Editar noticia (admin) — Morvedre Core",
};

export default async function EditAdminNewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const { ownProfile, activeProfile } = ctx;

  const supabase = await createClient();
  const { data: adminRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", ownProfile.id)
    .eq("role", "admin")
    .is("scope_team_id", null)
    .maybeSingle();
  if (!adminRole) redirect("/dashboard");

  const post = await getNewsPost(id, activeProfile.id);
  if (!post) notFound();

  const { data: teams } = await supabase.from("teams").select("id, label").order("label");
  const teamOptions: TeamOption[] = (teams ?? []).map((t) => ({
    id: (t as { id: string }).id,
    label: (t as { label: string }).label,
  }));

  async function handleSubmit(data: {
    title: string;
    body_md: string;
    image_url: string | null;
    audience: "club" | "team";
    audience_team_id: string | null;
    pinned: boolean;
    expires_at: string | null;
    imageFile: File | null;
  }) {
    "use server";
    await updateNewsPost({
      post_id: id,
      title: data.title,
      body_md: data.body_md,
      image_url: data.image_url,
      audience: data.audience,
      audience_team_id: data.audience_team_id,
      pinned: data.pinned,
      expires_at: data.expires_at,
      imageFile: data.imageFile,
    });
    redirect(`/admin/news` as Route);
  }

  async function handlePin(pinned: boolean) {
    "use server";
    await togglePinNews({ post_id: id, pinned });
  }

  async function handleDelete() {
    "use server";
    await deleteNewsPost({ post_id: id });
    redirect(`/admin/news` as Route);
  }

  return (
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0" />
      <div className="relative z-[1] mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4">
        <Link
          href={"/admin/news" as Route}
          className="text-pool-blue inline-flex items-center gap-1 text-xs font-bold hover:underline"
        >
          <ArrowLeft className="h-3 w-3" />
          Noticias
        </Link>
        <header className="flex items-center gap-2">
          <PictogramBadge pictogram={Megaphone} color="var(--pool-deep)" size="md" />
          <div>
            <h1 className="font-display text-pool-deep text-2xl font-extrabold">Editar noticia</h1>
            <p className="text-ink-600 text-xs">Modifica el contenido del tablón.</p>
          </div>
        </header>
        <NewsEditor
          mode="edit"
          teams={teamOptions}
          initial={{
            title: post.title,
            body_md: post.body_md,
            image_url: post.image_url,
            audience: post.audience,
            audience_team_id: post.audience_team_id,
            pinned: post.pinned,
            expires_at: post.expires_at,
          }}
          onSubmit={handleSubmit}
          onPinToggle={handlePin}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
