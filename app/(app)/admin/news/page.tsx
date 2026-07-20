import Link from "next/link";
import type { Route } from "next";
import { Megaphone, Plus, Pin, Clock, ChevronRight } from "lucide-react";

import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-page";
import { getNewsForAdmin } from "@/server/queries/news";
import { deleteNewsPost, togglePinNews } from "@/server/actions/admin/news";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { EmptyState } from "@/components/ui/empty-state";
import { relativeTime } from "@/lib/domain/news";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Noticias (admin) — Morvedre Core",
  description: "Gestión de noticias y tablón.",
};

export default async function AdminNewsPage() {
  const posts = await getNewsForAdmin();

  async function deletePostAction(formData: FormData) {
    "use server";
    const postId = String(formData.get("post_id") ?? "");
    await deleteNewsPost({ post_id: postId });
  }

  async function togglePinAction(formData: FormData) {
    "use server";
    const postId = String(formData.get("post_id") ?? "");
    const pinned = formData.get("pinned") === "true";
    await togglePinNews({ post_id: postId, pinned: !pinned });
  }

  return (
    <AdminPageShell>
      <AdminPageHeader
        title="Noticias"
        description="Crea y gestiona el tablón del club."
        icon={<Megaphone className="h-6 w-6" aria-hidden="true" />}
        action={
          <Link
            href={"/admin/news/new" as Route}
            className="bg-pool-deep text-paper hover:bg-pool-blue focus-visible:ring-pool-blue inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:w-auto"
          >
            <Plus className="h-5 w-5" aria-hidden="true" /> Nueva noticia
          </Link>
        }
      />

      {posts.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="h-6 w-6" aria-hidden="true" />}
          title="Todavía no hay noticias"
          description="Publica el primer aviso para que todo el club lo vea en su tablón."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {posts.map((p) => (
            <li
              key={p.id}
              className={cn(
                "bg-paper-card shadow-elev-1 flex flex-col gap-3 rounded-2xl border p-4",
                p.pinned ? "border-ball-gold" : "border-ink-300",
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {p.pinned ? (
                    <Pin className="text-ball-gold h-3 w-3 shrink-0" aria-hidden="true" />
                  ) : null}
                  <p className="text-pool-deep line-clamp-2 text-base font-extrabold">{p.title}</p>
                </div>
                <p className="text-ink-600 mt-1 flex flex-wrap items-center gap-x-1 text-sm font-semibold">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  {relativeTime(p.published_at)}
                  {p.audience === "team" && p.audience_team_id ? (
                    <span className="ml-1">· equipo</span>
                  ) : (
                    <span className="ml-1">· club</span>
                  )}
                  {p.expires_at ? (
                    <span className="text-ink-500 ml-1">· caduca {relativeTime(p.expires_at)}</span>
                  ) : null}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <form action={togglePinAction} className="min-w-0">
                  <input type="hidden" name="post_id" value={p.id} />
                  <input type="hidden" name="pinned" value={String(p.pinned)} />
                  <button
                    type="submit"
                    data-pin-toggle={p.id}
                    className={cn(
                      "inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-lg border px-2 text-sm font-extrabold transition-colors",
                      p.pinned
                        ? "border-ball-gold bg-ball-gold/15 text-pool-deep hover:bg-ball-gold/25"
                        : "border-ink-300 bg-paper text-ink-700 hover:bg-pool-foam",
                    )}
                  >
                    <Pin className="h-4 w-4" aria-hidden="true" />
                    {p.pinned ? "Fijada" : "Fijar"}
                  </button>
                </form>
                <Link
                  href={`/admin/news/${p.id}` as Route}
                  className="border-ink-300 bg-paper text-pool-deep hover:bg-pool-foam focus-visible:ring-pool-blue inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border px-2 text-sm font-extrabold transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  Editar
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <form id={`delete-news-${p.id}`} action={deletePostAction}>
                  <input type="hidden" name="post_id" value={p.id} />
                  <ConfirmSubmit
                    formId={`delete-news-${p.id}`}
                    title="Eliminar esta noticia"
                    description="La noticia desaparecerá del tablón para todo el club. Esta acción no se puede deshacer."
                  />
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AdminPageShell>
  );
}
