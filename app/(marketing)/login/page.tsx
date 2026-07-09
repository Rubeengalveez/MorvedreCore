import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "@/components/auth/login-form";
import { AuthErrorBanner, type AuthErrorCode } from "@/components/auth/auth-error-banner";
import { LanePattern } from "@/components/ui/lane-pattern";

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
    <div className="bg-pool-deep relative isolate min-h-svh overflow-hidden text-white">
      <a
        href="#login-main"
        className="focus-visible:ring-paper sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-pool-deep focus:shadow-elev-3 focus:outline-none"
      >
        Saltar al formulario
      </a>

      <LanePattern as="div" className="absolute inset-0 opacity-30" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,32,72,0)_0%,rgba(6,32,72,0.6)_100%)]"
      />

      <div
        aria-hidden="true"
        className="absolute top-0 left-0 h-full w-2 bg-pool-teal/40"
      />

      <header className="relative flex items-center gap-3 px-5 pt-[max(env(safe-area-inset-top),14px)] pb-4 sm:px-6">
        <Logo size={56} className="shadow-elev-3 rounded-[var(--r-sm)]" />
        <div className="flex min-w-0 flex-1 flex-col leading-none">
          <span className="text-eyebrow text-ball-gold">Waterpolo Morvedre</span>
          <span className="font-display text-lg font-extrabold tracking-tight">
            Morvedre Core
          </span>
        </div>
        <span className="text-eyebrow text-white/55 hidden sm:inline">24/25</span>
      </header>

      <main
        id="login-main"
        lang="es"
        className="relative mx-auto flex w-full max-w-md flex-col gap-5 px-5 pt-2 pb-[max(env(safe-area-inset-bottom),20px)] sm:max-w-lg sm:px-6"
        aria-labelledby="login-title"
      >
        <div className="flex flex-col gap-1 pt-2">
          <span className="text-eyebrow text-pool-teal">Acceso</span>
          <h1
            id="login-title"
            className="font-display text-[34px] leading-[0.95] font-extrabold tracking-tight sm:text-[40px]"
          >
            Morvedre Core
          </h1>
        </div>

        <div className="border-white/12 bg-white/5 rounded-[var(--r-md)] border p-1 backdrop-blur-sm">
          <div className="bg-paper rounded-[var(--r-sm)] p-5 text-ink-900 sm:p-6">
            {errorCode ? <AuthErrorBanner code={errorCode} provider="google" /> : null}
            <LoginForm next={next} error={showFormError ? formError : undefined} />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 pt-1">
          <span className="text-eyebrow text-white/40">Morvedre · Puerto de Sagunto</span>
        </div>
      </main>
    </div>
  );
}
