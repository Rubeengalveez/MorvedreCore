import Image from "next/image";
import type { Metadata } from "next";
import type { Route } from "next";

import { LoginCard } from "@/components/auth/login-form";
import { WaterDivider } from "@/components/ui/water-divider";

export const metadata: Metadata = {
  title: "Entrar — Morvedre Core",
  description: "Inicia sesión en la app del Waterpolo Morvedre.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const nextRaw = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = typeof nextRaw === "string" ? nextRaw : undefined;

  return (
    <main
      lang="es"
      className="relative flex min-h-dvh flex-col bg-paper"
    >
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-0">
          <WaterDivider fill="var(--brand-foam)" height={64} />
        </div>
        <div className="relative z-10 mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-6 pb-10 pt-16 text-center sm:pb-14 sm:pt-20">
          <Image
            src="/brand/shark-512.png"
            alt="Escudo Waterpolo Morvedre"
            width={192}
            height={192}
            priority
            className="h-44 w-44 sm:h-48 sm:w-48"
          />
          <h1 className="font-display text-2xl font-extrabold leading-tight text-brand-deep sm:text-[28px]">
            La app del Waterpolo Morvedre
          </h1>
          <p className="text-base text-ink-600">Inicia sesión</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center gap-8 px-6 pb-12">
        <LoginCard next={next} />
        <p className="text-center text-xs text-ink-600">
          ¿Problemas para entrar? Escribe a{" "}
          <a
            href={"mailto:galvillo9@gmail.com" as Route}
            className="font-semibold text-brand-blue hover:underline"
          >
            galvillo9@gmail.com
          </a>
        </p>
      </div>
    </main>
  );
}
