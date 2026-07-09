import Image from "next/image";
import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { AuthErrorBanner, type AuthErrorCode } from "@/components/auth/auth-error-banner";
import { LanePattern } from "@/components/ui/lane-pattern";

export const metadata: Metadata = {
  title: "Entrar — Morvedre Core",
  description: "Accede a la app del Club Waterpolo Morvedre.",
};

const VALID_ERRORS: ReadonlySet<string> = new Set([
  "oauth_provider_disabled",
  "oauth_redirect_uri",
  "oauth_no_url",
  "callback",
  "callback_redirect_uri",
  "callback_code_expired",
  "callback_google",
  "callback_validation",
  "oauth",
]);

const VALID_FORM_ERRORS: ReadonlySet<string> = new Set([
  "invalid_credentials",
  "pending_request",
]);

function parseError(raw: string | string[] | undefined): AuthErrorCode {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;
  if (VALID_ERRORS.has(value)) return value as AuthErrorCode;
  if (VALID_FORM_ERRORS.has(value)) return value as AuthErrorCode;
  return undefined;
}

function parseFormError(
  raw: string | string[] | undefined,
): "invalid_credentials" | "pending_request" | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;
  if (VALID_FORM_ERRORS.has(value)) {
    return value as "invalid_credentials" | "pending_request";
  }
  return undefined;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string | string[];
    error?: string | string[];
    provider?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const nextRaw = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = typeof nextRaw === "string" ? nextRaw : undefined;
  const errorCode = parseError(params.error);
  const formError = parseFormError(params.error);

  const showFormError = formError && !errorCode;

  return (
    <div className="bg-paper min-h-svh">
      <a
        href="#login-main"
        className="bg-pool-deep text-paper focus-visible:ring-pool-blue focus-visible:ring-offset-paper sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-elev-3 focus:outline-none"
      >
        Saltar al formulario
      </a>

      <header className="bg-pool-deep relative isolate overflow-hidden text-white">
        <LanePattern as="div" className="absolute inset-0 opacity-20" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,140,142,0.18),transparent_55%)]"
        />

        <div className="relative mx-auto flex max-w-md items-center gap-3 px-5 pt-[max(env(safe-area-inset-top),16px)] pb-5 sm:max-w-lg sm:px-6 md:max-w-2xl">
          <Image
            src="/brand/icon-192.png"
            alt=""
            width={48}
            height={48}
            priority
            className="border-white/14 bg-pool-deep shadow-elev-2 h-12 w-12 shrink-0 rounded-[var(--r-sm)] border object-cover"
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-eyebrow text-ball-gold">Waterpolo Morvedre</span>
            <span className="font-display text-base leading-tight font-extrabold tracking-tight">
              Morvedre Core
            </span>
          </div>
          <span className="text-eyebrow text-white/55 hidden sm:inline">Temporada 24/25</span>
        </div>
      </header>

      <main
        id="login-main"
        lang="es"
        className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 pt-6 pb-[max(env(safe-area-inset-bottom),24px)] sm:max-w-lg sm:px-6 md:max-w-2xl"
        aria-labelledby="login-title"
      >
        <div className="flex flex-col gap-1.5">
          <span className="text-eyebrow text-pool-teal">Acceso al club</span>
          <h1
            id="login-title"
            className="font-display text-pool-deep text-2xl leading-tight font-extrabold tracking-tight sm:text-[28px]"
          >
            Entra al club
          </h1>
          <p className="text-ink-600 text-sm leading-relaxed sm:text-base">
            Usa el email y la contraseña que te dio el club. Si entras con tu cuenta, el primer día te guiamos para que la pongas a tu gusto.
          </p>
        </div>

        {errorCode ? <AuthErrorBanner code={errorCode} provider="google" /> : null}

        <div className="border-ink-300 bg-paper-card shadow-elev-2 rounded-[var(--r-md)] border p-5 sm:p-6">
          <LoginForm next={next} error={showFormError ? formError : undefined} />
        </div>

        <p className="text-ink-600 text-center text-xs leading-relaxed">
          ¿Problemas para entrar?{" "}
          <a
            href="mailto:galvillo9@gmail.com"
            className="text-pool-blue font-bold hover:underline focus-visible:underline focus-visible:outline-none"
          >
            Escríbeme
          </a>
          {" "}y lo arreglamos.
        </p>
      </main>
    </div>
  );
}
