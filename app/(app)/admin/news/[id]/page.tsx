import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, Megaphone } from "lucide-react";

import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-page";
import { getNewsPostForAdmin, getNewsTeamsForAdmin } from "@/server/queries/news";
import { deleteNewsPost, togglePinNews, updateNewsPost } from "@/server/actions/admin/news";
import { NewsEditor } from "@/components/news/news-editor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Editar noticia (admin) — Morvedre Core",
};

export default async function EditAdminNewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post, teamOptions] = await Promise.all([getNewsPostForAdmin(id), getNewsTeamsForAdmin()]);
  if (!post) notFound();

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
    <AdminPageShell width="lg">
      <Link
        href={"/admin/news" as Route}
        className="text-pool-blue hover:text-pool-deep focus-visible:ring-pool-blue inline-flex min-h-11 w-fit items-center gap-2 rounded-lg text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Todas las noticias
      </Link>
      <AdminPageHeader
        title="Editar noticia"
        description="Corrige el aviso o cambia a quién va dirigido."
        icon={<Megaphone className="h-6 w-6" aria-hidden="true" />}
      />
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
    </AdminPageShell>
  );
}
