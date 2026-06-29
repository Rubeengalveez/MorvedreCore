import Image from "next/image";
import type { Metadata } from "next";
import type { Route } from "next";

import { LoginCard } from "@/components/auth/login-form";
import { WaterDivider } from "@/components/ui/water-divider";
import { LanePattern } from "@/components/ui/lane-pattern";

export const metadata: Metadata = {
  title: "Entrar — Morvedre Core",
  description: "La app de tu equipo del alma.",
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
      className="relative flex min-h-dvh flex-col overflow-hidden bg-paper"
    >
      <LanePattern as="div" className="absolute inset-0" />
      <div className="relative z-[1] flex flex-1 flex-col">
        <div className="relative">
          <WaterDivider fill="var(--pool-teal)" height={48} />
          <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 px-6 pb-8 pt-8 text-center">
            <Image
              src="/brand/shark-256.png"
              alt="Escudo Waterpolo Morvedre"
              width={160}
              height={160}
              priority
              className="h-32 w-32 sm:h-40 sm:w-40"
            />
            <h1 className="font-display text-3xl font-extrabold leading-tight text-pool-deep sm:text-4xl">
              Morvedre, en el bolsillo.
            </h1>
            <p className="text-base text-ink-600">
              La app de tu equipo del alma.
            </p>
          </div>
          <WaterDivider fill="var(--pool-foam)" height={32} variant="footer" />
        </div>

        <div className="flex flex-1 flex-col items-center gap-8 px-6 pb-12 pt-8">
          <LoginCard next={next} />
          <p className="text-center text-xs text-ink-600">
            ¿Problemas para entrar? Escribe a{" "}
            <a
              href={"mailto:galvillo9@gmail.com" as Route}
              className="font-semibold text-pool-blue hover:underline"
            >
              galvillo9@gmail.com
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
