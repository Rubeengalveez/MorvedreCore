import Link from "next/link";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export default function Home() {
  return (
    <main
      lang="es"
      className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6 py-12"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-10 text-center">
        <div className="flex flex-col items-center gap-4">
          <Logo size={88} />
          <div className="flex flex-col items-center gap-1">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-brand-deep">
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
      </div>
    </main>
  );
}
