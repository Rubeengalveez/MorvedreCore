import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { Megaphone, Plus, Pin, Clock, ChevronRight } from "lucide-react";

import { getActiveProfileContext } from "@/server/queries/active-profile";
import { createClient } from "@/lib/supabase/server";
import { getNewsForAdmin } from "@/server/queries/news";
import { deleteNewsPost, togglePinNews } from "@/server/actions/admin/news";
import { LanePattern } from "@/components/ui/lane-pattern";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import { relativeTime } from "@/lib/domain/news";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Noticias (admin) — Morvedre Core",
  description: "Gestión de noticias y tablón.",
};

export default async function AdminNewsPage() {
  const ctx = await getActiveProfileContext();
  if (!ctx) redirect("/login");
  const { ownProfile } = ctx;

  const supabase = await createClient();
  const { data: adminRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", ownProfile.id)
    .eq("role", "admin")
    .is("scope_team_id", null)
    .maybeSingle();
  if (!adminRole) redirect("/dashboard");

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
    <div className="relative">
      <LanePattern as="div" className="absolute inset-0" />
      <div className="relative z-[1] mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-4">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PictogramBadge pictogram={Megaphone} color="var(--pool-deep)" size="md" />
            <div>
              <h1 className="font-display text-pool-deep text-2xl font-extrabold">Noticias</h1>
              <p className="text-ink-600 text-xs">Crea y gestiona el tablón del club.</p>
            </div>
          </div>
          <Link
            href={"/admin/news/new" as Route}
            className="bg-pool-deep text-paper hover:bg-ink-900 inline-flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-bold"
          >
            <Plus className="h-4 w-4" /> Nueva
          </Link>
        </header>

        {posts.length === 0 ? (
          <div className="border-ink-300 bg-paper-card text-ink-600 rounded-md border border-dashed p-6 text-center text-sm">
            No has publicado nada todavía.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {posts.map((p) => (
              <li
                key={p.id}
                className={cn(
                  "bg-paper-card shadow-elev-1 flex items-center gap-2 rounded-md border p-2.5",
                  p.pinned ? "border-ball-gold" : "border-ink-300",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {p.pinned ? (
                      <Pin className="text-ball-gold h-3 w-3 shrink-0" aria-hidden="true" />
                    ) : null}
                    <p className="text-pool-deep line-clamp-1 text-sm font-extrabold">{p.title}</p>
                  </div>
                  <p className="text-ink-600 text-[10px]">
                    <Clock className="mr-0.5 inline h-2.5 w-2.5" aria-hidden="true" />
                    {relativeTime(p.published_at)}
                    {p.audience === "team" && p.audience_team_id ? (
                      <span className="ml-1">· equipo</span>
                    ) : (
                      <span className="ml-1">· club</span>
                    )}
                    {p.expires_at ? (
                      <span className="text-ink-500 ml-1">
                        · caduca {relativeTime(p.expires_at)}
                      </span>
                    ) : null}
                  </p>
                </div>
                <form action={togglePinAction}>
                  <input type="hidden" name="post_id" value={p.id} />
                  <input type="hidden" name="pinned" value={String(p.pinned)} />
                  <button
                    type="submit"
                    data-pin-toggle={p.id}
                    className={cn(
                      "touch-target inline-flex h-10 items-center gap-1 rounded-md border px-3 text-xs font-bold transition-colors",
                      p.pinned
                        ? "border-ball-gold bg-ball-gold/15 text-pool-deep hover:bg-ball-gold/25"
                        : "border-ink-300 bg-paper text-ink-700 hover:bg-pool-foam",
                    )}
                  >
                    <Pin className="h-3.5 w-3.5" />
                    {p.pinned ? "Fijada" : "Fijar"}
                  </button>
                </form>
                <Link
                  href={`/admin/news/${p.id}` as Route}
                  className="border-ink-300 bg-paper text-pool-deep hover:bg-pool-foam touch-target inline-flex h-10 items-center gap-1 rounded-md border px-3 text-xs font-bold"
                >
                  Editar
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
                <form action={deletePostAction}>
                  <input type="hidden" name="post_id" value={p.id} />
                  <button
                    type="submit"
                    data-delete-news={p.id}
                    className="border-ink-300 bg-paper text-goggle-red hover:bg-goggle-red/5 touch-target inline-flex h-10 items-center rounded-md border px-3 text-xs font-bold"
                  >
                    Eliminar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
