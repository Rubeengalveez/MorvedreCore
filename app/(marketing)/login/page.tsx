import type { Metadata } from "next";
import type { Route } from "next";

import { LoginCard } from "@/components/auth/login-form";

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
      className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6 py-12"
    >
      <LoginCard next={next} />
      <p className="mt-10 text-center text-xs text-ink-600">
        ¿Problemas para entrar? Escribe a{" "}
        <a
          href={"mailto:galvillo9@gmail.com" as Route}
          className="font-semibold text-brand-blue hover:underline"
        >
          galvillo9@gmail.com
        </a>
      </p>
    </main>
  );
}
