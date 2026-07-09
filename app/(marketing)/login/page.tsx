import Image from "next/image";
import type { Metadata } from "next";
import type { Route } from "next";

import { LoginCard } from "@/components/auth/login-form";
import { AuthErrorBanner, type AuthErrorCode } from "@/components/auth/auth-error-banner";
import { LanePattern } from "@/components/ui/lane-pattern";

export const metadata: Metadata = {
  title: "Entrar - Morvedre Core",
  description: "La app de tu equipo del alma.",
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
  if (VALID_FORM_ERRORS.has(value)) return value as "invalid_credentials" | "pending_request";
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
    <main
      id="main-content"
      lang="es"
      className="bg-pool-deep text-paper relative flex h-svh flex-col overflow-hidden"
    >
      <LanePattern as="div" className="absolute inset-0 opacity-25" />
      <div className="absolute inset-x-0 top-0 h-[38svh] bg-[linear-gradient(180deg,rgba(13,148,136,0.34),rgba(6,26,58,0))]" />

      <div className="relative z-[1] mx-auto flex h-full w-full max-w-md flex-col md:max-w-5xl md:flex-row md:items-stretch">
        <section className="flex h-[clamp(112px,24svh,178px)] shrink-0 flex-col justify-between px-5 pt-[max(env(safe-area-inset-top),12px)] pb-3 md:h-auto md:min-h-dvh md:w-[45%] md:px-8 md:py-8 [@media(max-height:640px)]:justify-start">
          <div className="flex items-center justify-between gap-3">
            <Image
              src="/brand/icon-192.png"
              alt="Escudo Waterpolo Morvedre"
              width={72}
              height={72}
              priority
              className="bg-pool-deep shadow-elev-3 h-[clamp(46px,10svh,72px)] w-[clamp(46px,10svh,72px)] shrink-0 rounded-lg border border-white/14 object-cover"
            />
            <div className="shadow-elev-2 rounded-md border border-white/16 bg-white/8 px-2.5 py-1.5 text-right backdrop-blur-md">
              <p className="text-eyebrow text-ball-gold font-mono">Waterpolo</p>
              <p className="font-display text-xs leading-none font-extrabold">Morvedre</p>
            </div>
          </div>

          <div className="[@media(max-height:640px)]:hidden">
            <p className="text-eyebrow text-paper/58 font-mono">Gestion privada del club</p>
            <h1 className="font-display mt-0.5 max-w-[12ch] text-[clamp(1.25rem,5.7svw,2.1rem)] leading-[0.98] font-extrabold">
              Morvedre Core
            </h1>
          </div>
        </section>

        <section className="bg-paper text-ink-900 md:border-ink-300 min-h-0 flex-1 rounded-t-[16px] border-t border-white/15 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),12px)] shadow-[0_-18px_50px_rgba(0,0,0,0.18)] md:my-8 md:mr-8 md:flex md:items-center md:rounded-xl md:border md:px-6 md:py-6 [@media(max-height:640px)]:pt-2">
          <div className="mx-auto flex h-full min-h-0 w-full max-w-sm flex-col justify-center gap-2.5 md:h-auto [@media(max-height:640px)]:justify-start">
            {errorCode ? <AuthErrorBanner code={errorCode} provider="google" /> : null}
            <LoginCard next={next} error={formError} />
            <p className="text-eyebrow text-ink-600 text-center leading-snug min-[370px]:text-[11px] [@media(max-height:640px)]:hidden">
              ¿Problemas para entrar?{" "}
              <a
                href={"mailto:galvillo9@gmail.com" as Route}
                className="text-pool-blue font-bold hover:underline"
              >
                Escríbeme
              </a>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
