import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, Megaphone } from "lucide-react";

import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-page";
import { createNewsPost } from "@/server/actions/admin/news";
import { NewsEditor, type TeamOption } from "@/components/news/news-editor";
import { getNewsTeamsForAdmin } from "@/server/queries/news";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Nueva noticia (admin) — Morvedre Core",
};

export default async function NewAdminNewsPage() {
  const teamOptions: TeamOption[] = await getNewsTeamsForAdmin();

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
    const { id } = await createNewsPost({
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
    void id;
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
        title="Nueva noticia"
        description="Escribe el aviso, elige quién lo verá y publícalo."
        icon={<Megaphone className="h-6 w-6" aria-hidden="true" />}
      />
      <NewsEditor mode="create" teams={teamOptions} onSubmit={handleSubmit} />
    </AdminPageShell>
  );
}
