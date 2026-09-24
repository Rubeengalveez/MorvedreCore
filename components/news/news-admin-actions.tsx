"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Pencil, Pin, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { ConfirmActionSheet } from "@/components/ui/confirm-action-sheet";
import { deleteNewsPost, togglePinNews } from "@/server/actions/admin/news";

export function NewsAdminActions({
  postId,
  title,
  pinned,
  fromNews = false,
}: {
  postId: string;
  title: string;
  pinned: boolean;
  fromNews?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePin() {
    setError(null);
    startTransition(async () => {
      try {
        await togglePinNews({ post_id: postId, pinned: !pinned });
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No pudimos cambiar el destacado.");
      }
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteNewsPost({ post_id: postId });
        setDeleteOpen(false);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No pudimos eliminar la noticia.");
      }
    });
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <Link
          href={`/admin/news/${postId}${fromNews ? "?from=news" : ""}` as Route}
          className="bg-pool-deep text-paper focus-visible:ring-pool-blue inline-flex min-h-12 flex-1 touch-manipulation items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:flex-none"
        >
          <Pencil aria-hidden="true" className="h-4 w-4" /> Editar
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={togglePin}
          data-pin-toggle={postId}
          className="border-ink-300 bg-paper-card text-pool-deep hover:bg-pool-foam focus-visible:ring-pool-blue inline-flex min-h-12 flex-1 touch-manipulation items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60 sm:flex-none"
        >
          <Pin aria-hidden="true" className="h-4 w-4" />
          {pinned ? "Desfijar" : "Destacar"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setDeleteOpen(true)}
          aria-label={`Eliminar ${title}`}
          className="border-goggle-red/30 bg-paper-card text-goggle-red hover:bg-goggle-red/5 focus-visible:ring-goggle-red inline-flex h-12 w-12 shrink-0 touch-manipulation items-center justify-center rounded-xl border focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
        >
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      {error && !deleteOpen ? (
        <p role="alert" className="text-goggle-red mt-2 text-xs font-semibold">
          {error}
        </p>
      ) : null}
      <ConfirmActionSheet
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar noticia"
        description={`«${title}» desaparecerá del tablón para todo el club.`}
        confirmLabel="Sí, eliminar"
        isPending={pending}
        error={error}
        onConfirm={remove}
      />
    </div>
  );
}
