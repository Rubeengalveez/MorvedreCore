import Image from "next/image";
import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { AuthErrorBanner, type AuthErrorCode } from "@/components/auth/auth-error-banner";

export const metadata: Metadata = {
  title: "Acceso — Morvedre Core",
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

const VALID_FORM_ERRORS: ReadonlySet<string> = new Set(["invalid_credentials", "pending_request"]);

function parseError(raw: string | string[] | undefined): AuthErrorCode {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return undefined;
  if (VALID_ERRORS.has(value)) return value as AuthErrorCode;
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

  return (
    <div className="bg-paper relative isolate flex min-h-svh flex-col items-center justify-start overflow-x-hidden overflow-y-auto px-4 pt-6 pb-4 sm:px-6 sm:pt-12 sm:pb-6">
      <a
        href="#login-form"
        className="bg-pool-deep shadow-elev-3 focus-visible:ring-pool-blue focus-visible:ring-offset-paper sr-only rounded-md px-3 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        Saltar al formulario
      </a>

      <div
        aria-hidden="true"
        className="shadow-elev-2 pointer-events-none absolute inset-x-0 top-0 h-[54svh] rounded-b-[2rem] bg-[linear-gradient(180deg,#062048_0%,#1657a8_100%)] sm:h-[62svh] sm:rounded-b-[2.5rem]"
      />

      <div className="relative z-10 flex w-full max-w-[400px] flex-col items-center gap-4 sm:gap-8">
        <div className="flex flex-col items-center gap-3 text-center sm:gap-4">
          <Image
            src="/brand/icon-192.png"
            alt="Escudo del Waterpolo Morvedre"
            width={160}
            height={160}
            priority
            className="h-[118px] w-[118px] rounded-full object-cover min-[390px]:h-[140px] min-[390px]:w-[140px] sm:h-[200px] sm:w-[200px]"
          />

          <div className="flex flex-col gap-1 sm:gap-1.5">
            <h1 className="font-display text-[32px] leading-none font-extrabold tracking-tight text-white drop-shadow-md min-[390px]:text-[36px] sm:text-[44px]">
              Morvedre Core
            </h1>
            <span className="text-eyebrow text-xs tracking-wide text-white/75 min-[390px]:text-sm">
              App oficial del Waterpolo Morvedre
            </span>
          </div>
        </div>

        <div className="bg-paper-card shadow-elev-2 w-full rounded-[var(--r-xl)] p-5 sm:p-8">
          {errorCode ? <AuthErrorBanner code={errorCode} provider="google" /> : null}
          <LoginForm next={next} error={formError} />
        </div>

        <p className="text-ink-500 text-center text-xs">
          &iquest;Problemas para entrar?{" "}
          <a
            href="mailto:galvillo9@gmail.com"
            className="text-pool-blue font-semibold hover:underline focus-visible:underline focus-visible:outline-none"
          >
            Escr&iacute;beme
          </a>
        </p>
      </div>
    </div>
  );
}
