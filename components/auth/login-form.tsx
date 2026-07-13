"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import type { Route } from "next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn } from "@/server/actions/auth";

const GoogleIcon = () => (
  <svg
    className="h-5 w-5 shrink-0"
    viewBox="0 0 24 24"
    width="20"
    height="20"
    aria-hidden="true"
    focusable="false"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

export interface LoginFormProps {
  next?: string;
  error?: "invalid_credentials" | "pending_request";
}

export function LoginForm({ next, error }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const safeNext = next ?? "/dashboard";
  const googleRedirectUrl = `/api/auth/google?next=${encodeURIComponent(safeNext)}`;

  return (
    <>
      <form
        id="login-form"
        action={(formData) => {
          startTransition(async () => {
            try {
              await signIn(formData);
            } catch {}
          });
        }}
        className="flex w-full flex-col gap-4"
      >
        {error === "invalid_credentials" ? (
          <div
            role="alert"
            className="border-danger/30 bg-danger/10 text-danger rounded-[var(--r-sm)] border px-3 py-2 text-sm font-semibold"
          >
            Email o contraseña incorrectos.
          </div>
        ) : null}

        {error === "pending_request" ? (
          <div
            role="status"
            className="border-pool-teal/30 bg-pool-teal/10 text-pool-deep rounded-[var(--r-sm)] border px-3 py-2 text-sm font-semibold"
          >
            Tu solicitud está pendiente de aprobación.
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-eyebrow text-ink-700">
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
            placeholder="tu@email.com"
            defaultValue=""
            required
            className="bg-pool-ice focus:border-pool-blue focus:bg-paper h-[52px] min-h-[52px] rounded-[var(--r-sm)] border-transparent px-4"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-eyebrow text-ink-700">
            Contraseña
          </label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              spellCheck={false}
              placeholder="••••••••"
              defaultValue=""
              required
              className="bg-pool-ice focus:border-pool-blue focus:bg-paper h-[52px] min-h-[52px] rounded-[var(--r-sm)] border-transparent pr-12 pl-4"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={showPassword}
              className="text-ink-600 hover:text-pool-deep hover:bg-pool-foam focus-visible:ring-pool-blue focus-visible:ring-offset-paper touch-target absolute top-1/2 right-2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[var(--r-sm)] transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Eye className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <input type="hidden" name="next" value={safeNext} />

        <Link
          href={"/reset-password" as Route}
          className="text-pool-blue self-end text-xs font-bold hover:underline focus-visible:underline focus-visible:outline-none"
        >
          ¿Olvidaste la contraseña?
        </Link>

        <div className="flex flex-col gap-3 pt-1">
          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Entrando&hellip;</span>
              </>
            ) : (
              <span>Entrar</span>
            )}
          </Button>
        </div>
      </form>

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="border-ink-200 w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-paper-card text-ink-400 px-2">o</span>
        </div>
      </div>

      <a
        href={googleRedirectUrl}
        rel="noopener"
        className="focus-visible:ring-pool-blue border-ink-200 bg-paper text-ink-700 hover:bg-ink-50 focus-visible:ring-offset-paper inline-flex w-full items-center justify-center gap-2.5 rounded-[var(--r-sm)] border py-3 text-sm font-semibold shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <GoogleIcon />
        <span>Continuar con Google</span>
      </a>
    </>
  );
}
