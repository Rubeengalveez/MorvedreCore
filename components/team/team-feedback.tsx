"use client";

import Link from "next/link";
import type { Route } from "next";
import { CircleAlert, Loader2, UsersRound } from "lucide-react";
import { PageShell } from "@/components/ui/page-shell";
import { teamPrimary, teamSecondary } from "./team-ui";

export function TeamLoading({ admin = false }: { admin?: boolean }) {
  return (
    <PageShell width="md">
      <div className="flex min-h-[calc(100dvh-var(--top-bar-height)-var(--bottom-nav-height)-3rem)] items-center justify-center">
        <section
          role="status"
          aria-busy="true"
          className="border-pool-deep/65 text-pool-deep w-full max-w-sm overflow-hidden rounded-3xl border-2 bg-white"
        >
          <div className="bg-pool-deep flex items-center gap-3 px-5 py-5 text-white">
            <UsersRound className="h-7 w-7" aria-hidden="true" />
            <h1 className="text-2xl font-extrabold">{admin ? "Gestionar equipos" : "Equipos"}</h1>
          </div>
          <div className="grid justify-items-center gap-4 px-6 py-8 text-center">
            <Loader2
              className="text-pool-blue h-10 w-10 motion-safe:animate-spin"
              aria-hidden="true"
            />
            <h2 className="text-xl font-extrabold">Preparando el equipo…</h2>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

export function TeamProblem({
  admin = false,
  retry,
  missing = false,
}: {
  admin?: boolean;
  retry?: () => void;
  missing?: boolean;
}) {
  return (
    <PageShell width="md">
      <section className="border-pool-deep/65 text-pool-deep overflow-hidden rounded-2xl border-2 bg-white">
        <div className="bg-pool-deep flex items-center gap-3 p-5 text-white">
          <CircleAlert className="h-7 w-7 shrink-0" aria-hidden="true" />
          <h1 className="text-2xl font-extrabold">
            {missing ? "Esta ficha no está disponible" : "No pudimos cargar el equipo"}
          </h1>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-base font-medium">
            {missing
              ? "Vuelve a la lista para elegir un equipo."
              : "Comprueba tu conexión y vuelve a intentarlo."}
          </p>
          {retry && (
            <button className={`${teamPrimary} w-full`} onClick={retry} type="button">
              Volver a intentar
            </button>
          )}
          <Link
            className={`${teamSecondary} w-full`}
            href={(admin ? "/admin/teams" : "/team") as Route}
          >
            Volver a equipos
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
