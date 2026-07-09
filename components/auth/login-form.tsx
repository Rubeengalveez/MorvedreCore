"use client";

import { useState } from "react";
import Link from "next/link";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import type { Route } from "next";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signIn } from "@/server/actions/auth";

const GoogleIcon = () => (
  <svg
    className="h-5 w-5 shrink-0"
    viewBox="0 0 24 24"
    width="24"
    height="24"
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const googleRedirectUrl = `/api/auth/google?next=${encodeURIComponent(next || "/dashboard")}`;

  return (
    <form
      action={signIn}
      onSubmit={() => setIsSubmitting(true)}
      className="flex w-full flex-col gap-2.5 [@media(max-height:640px)]:gap-2"
      noValidate
    >
      {error === "invalid_credentials" ? (
        <Alert
          variant="danger"
          title="No pudimos entrar"
          className="flex flex-col gap-1.5 p-3 text-left text-xs"
        >
          <p>Email o contraseña incorrectos.</p>
        </Alert>
      ) : null}

      {error === "pending_request" ? (
        <Alert
          variant="info"
          title="Solicitud pendiente"
          className="flex flex-col gap-1.5 p-3 text-left text-xs"
        >
          <p>Tu solicitud ya está enviada. El club tiene que aprobarla antes de que puedas entrar.</p>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-ink-700 text-xs font-bold">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="tu@email.com"
          defaultValue=""
          required
          autoFocus
          className="bg-paper-card h-11 min-h-11 rounded-lg [@media(max-height:640px)]:h-10 [@media(max-height:640px)]:min-h-10"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="password" className="text-ink-700 text-xs font-bold">
            Contraseña
          </label>
          <Link
            href={"/reset-password" as Route}
            className="text-pool-blue text-xs font-bold hover:underline focus-visible:underline focus-visible:outline-none"
          >
            Recuperar
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            defaultValue=""
            required
            className="bg-paper-card h-11 min-h-11 rounded-lg pr-12 [@media(max-height:640px)]:h-10 [@media(max-height:640px)]:min-h-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="text-ink-600 hover:bg-pool-foam hover:text-pool-deep touch-target absolute top-1/2 right-1.5 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md focus-visible:outline-none"
            tabIndex={-1}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? (
              <MdVisibilityOff className="h-5 w-5" />
            ) : (
              <MdVisibility className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      <input type="hidden" name="next" value={next ?? "/dashboard"} />

      <div className="flex flex-col gap-2 pt-0.5 [@media(max-height:640px)]:gap-1.5">
        <Button type="submit" size="sm" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Entrando..." : "Entrar"}
        </Button>

        <div className="relative flex items-center justify-center py-1 [@media(max-height:640px)]:py-0.5">
          <span className="bg-ink-300 absolute inset-x-0 h-px" />
          <span className="bg-paper text-eyebrow text-ink-600 relative px-3">O accede con</span>
        </div>

        <Button
          asChild
          variant="secondary"
          size="sm"
          className="text-ink-800 flex w-full items-center justify-center gap-3 rounded-lg font-semibold"
        >
          <a href={googleRedirectUrl}>
            <GoogleIcon />
            Google
          </a>
        </Button>
      </div>

      <div className="flex flex-col gap-1.5 text-center [@media(max-height:640px)]:gap-1">
        <span className="text-ink-600 text-xs">¿Eres nuevo en el club?</span>
        <p className="text-eyebrow text-ink-500 mx-auto max-w-[16rem] text-balance min-[370px]:max-w-none min-[370px]:text-sm [@media(max-height:640px)]:text-[11px]">
          Intenta entrar con tu email y te guiaremos para solicitar acceso.
        </p>
      </div>
    </form>
  );
}

export interface LoginCardProps {
  next?: string;
  error?: "invalid_credentials" | "pending_request";
}

export function LoginCard({ next, error }: LoginCardProps) {
  return (
    <div className="flex w-full flex-col gap-2.5 [@media(max-height:640px)]:gap-2">
      <div className="border-ink-300 flex items-end justify-between gap-3 border-b pb-2.5 [@media(max-height:640px)]:pb-2">
        <div>
          <p className="text-eyebrow text-pool-teal font-mono">Acceso</p>
          <h2 className="font-display text-pool-deep mt-0.5 text-xl leading-none font-extrabold [@media(max-height:640px)]:text-lg">
            Entra al club
          </h2>
        </div>
        <div className="bg-pool-deep text-paper rounded-md px-2.5 py-1.5 text-right [@media(max-height:640px)]:py-1">
          <p className="text-eyebrow text-ball-gold font-mono leading-none">CORE</p>
          <p className="text-eyebrow text-paper/80 mt-0.5 leading-none">24/25</p>
        </div>
      </div>
      <div className="w-full">
        <LoginForm next={next} error={error} />
      </div>
    </div>
  );
}
