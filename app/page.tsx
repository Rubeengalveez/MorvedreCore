import Link from "next/link";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { Tiburon } from "@/components/brand/pictograms";
import { LanePattern } from "@/components/ui/lane-pattern";

export default function Home() {
  return (
    <main
      lang="es"
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-paper px-6 py-12"
    >
      <LanePattern as="div" className="absolute inset-0" />
      <div className="relative z-[1] flex w-full max-w-sm flex-col items-center gap-10 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Logo size={96} />
            <Tiburon
              className="absolute -right-2 -top-2 h-8 w-10 rotate-12"
              accent="var(--ball-gold)"
              aria-hidden="true"
            />
          </div>
          <div className="flex flex-col items-center gap-1">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-pool-deep">
              Morvedre Core
            </h1>
            <p className="font-mono text-xs font-medium uppercase tracking-widest text-ink-600">
              La app del club
            </p>
          </div>
        </div>

        <p className="text-base leading-relaxed text-ink-600">
          Gestiona equipos, jugadores, staff y familias del Waterpolo Morvedre
          desde un único sitio.
        </p>

        <nav className="flex w-full flex-col gap-3">
          <Button asChild size="lg" className="w-full">
            <Link href={"/login" as Route}>Iniciar sesión</Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="w-full">
            <Link href={"/dashboard" as Route}>Ir al dashboard</Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="w-full">
            <Link href={"/admin" as Route}>Panel de administración</Link>
          </Button>
        </nav>

        <p className="text-[10px] font-medium uppercase tracking-widest text-ink-400">
          v0.3 · waterpolo morvedre
        </p>
      </div>
    </main>
  );
}
