"use client";

import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";

import { Logo } from "@/components/brand/logo";

export function StatusPage({
  eyebrow,
  title,
  description,
  retry,
}: {
  eyebrow: string;
  title: string;
  description: string;
  retry?: () => void;
}) {
  return (
    <main className="page-gutter flex min-h-dvh items-center justify-center py-10">
      <section className="border-ink-200 bg-paper-card shadow-elev-3 w-full max-w-md overflow-hidden rounded-[1.75rem] border">
        <div className="bg-pool-deep text-paper px-5 py-6 sm:px-7">
          <Logo size={48} />
          <p className="text-paper/65 mt-5 text-xs font-extrabold tracking-[0.14em] uppercase">
            {eyebrow}
          </p>
          <h1 className="font-display mt-2 text-3xl leading-tight font-extrabold text-balance">
            {title}
          </h1>
          <p className="text-paper/75 mt-3 text-base leading-relaxed text-pretty">{description}</p>
        </div>
        <div className="flex flex-col gap-2 p-5">
          {retry ? (
            <button
              type="button"
              onClick={retry}
              className="bg-pool-deep text-paper hover:bg-pool-blue focus-visible:ring-pool-blue inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-base font-extrabold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
              Intentar de nuevo
            </button>
          ) : null}
          <Link
            href="/dashboard"
            className="border-ink-200 text-pool-deep hover:bg-pool-foam focus-visible:ring-pool-blue inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-base font-extrabold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            Volver a Inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
