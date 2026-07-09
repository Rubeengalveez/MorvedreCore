"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import type { Route } from "next";

import { Alert } from "@/components/ui/alert";
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
    <form
      action={(formData) => {
        startTransition(async () => {
          try {
            await signIn(formData);
          } catch {
            // El redirect de Supabase o un error de credenciales caen aquí.
            // Si hay error, useTransition termina y el server action puede
            // haber redirigido a /login?error=invalid_credentials.
          }
        });
      }}
      noValidate
      className="flex w-full flex-col gap-4"
    >
      {error ? <LoginErrorAlert error={error} /> : null}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-ink-700 text-sm font-semibold leading-none"
        >
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
          className="h-12 min-h-12 rounded-[var(--r-sm)]"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor="password"
            className="text-ink-700 text-sm font-semibold leading-none"
          >
            Contraseña
          </label>
          <Link
            href={"/reset-password" as Route}
            className="text-pool-blue text-xs font-bold hover:underline focus-visible:underline focus-visible:outline-none"
          >
            ¿La olvidaste?
          </Link>
        </div>
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
            className="h-12 min-h-12 rounded-[var(--r-sm)] pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={showPassword}
            className="text-ink-600 hover:text-pool-deep hover:bg-pool-foam focus-visible:ring-pool-blue focus-visible:ring-offset-paper absolute top-1/2 right-1.5 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[var(--r-sm)] transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
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

      <div className="flex flex-col gap-3 pt-1">
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Entrando…</span>
            </>
          ) : (
            <span>Entrar</span>
          )}
        </Button>

        <div className="flex items-center gap-3 py-1" aria-hidden="true">
          <span className="bg-ink-200 h-px flex-1" />
          <span className="text-eyebrow text-ink-600">O continúa con</span>
          <span className="bg-ink-200 h-px flex-1" />
        </div>

        <Button
          asChild
          variant="secondary"
          size="lg"
          className="w-full"
        >
          <a href={googleRedirectUrl} rel="noopener">
            <GoogleIcon />
            <span>Google</span>
          </a>
        </Button>
      </div>

      <p className="text-ink-600 mt-2 text-center text-sm leading-relaxed">
        ¿Eres nuevo en el club?{" "}
        <span className="text-ink-700 block font-semibold sm:inline">
          Pide acceso y te avisaremos cuando el club te dé el visto bueno.
        </span>
      </p>
    </form>
  );
}

function LoginErrorAlert({
  error,
}: {
  error: "invalid_credentials" | "pending_request";
}) {
  if (error === "invalid_credentials") {
    return (
      <Alert
        variant="danger"
        title="No pudimos entrar"
        role="alert"
        className="flex flex-col gap-1.5 p-3 text-left text-sm leading-relaxed"
      >
        <p>El email o la contraseña no coinciden. Revisa que estén bien escritos.</p>
        <p className="text-ink-700 text-xs">
          ¿No te acuerdas?{" "}
          <Link
            href={"/reset-password" as Route}
            className="text-pool-blue font-bold hover:underline focus-visible:underline focus-visible:outline-none"
          >
            Recupérala en un minuto
          </Link>
          .
        </p>
      </Alert>
    );
  }

  return (
    <Alert
      variant="info"
      title="Tu solicitud está en revisión"
      role="status"
      className="flex flex-col gap-1.5 p-3 text-left text-sm leading-relaxed"
    >
      <p>Ya hemos recibido tu solicitud de acceso. El club la revisa y te avisa cuando esté aprobada.</p>
      <p className="text-ink-700 text-xs">
        Si llevas varios días esperando, escribe a{" "}
        <a
          href="mailto:galvillo9@gmail.com"
          className="text-pool-blue font-bold hover:underline focus-visible:underline focus-visible:outline-none"
        >
          galvillo9@gmail.com
        </a>
        .
      </p>
    </Alert>
  );
}
