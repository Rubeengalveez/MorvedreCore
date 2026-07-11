"use client";

import Link from "next/link";
import type { Route } from "next";

import { Alert } from "@/components/ui/alert";

export type AuthErrorCode =
  | "oauth_provider_disabled"
  | "oauth_redirect_uri"
  | "oauth_no_url"
  | "callback"
  | "callback_redirect_uri"
  | "callback_code_expired"
  | "callback_google"
  | "callback_validation"
  | "oauth"
  | "pending_request"
  | undefined;

interface AuthErrorBannerProps {
  code: AuthErrorCode;
  provider?: string;
}

interface ErrorCopy {
  title: string;
  message: string;
  action: string;
  href: Route;
  variant: "danger" | "warning" | "info";
}

const COPY: Record<Exclude<AuthErrorCode, undefined>, ErrorCopy> = {
  oauth_provider_disabled: {
    title: "Google no está disponible ahora",
    message:
      "No hemos podido conectar con Google. Prueba de nuevo o avisa al administrador del club.",
    action: "Volver a intentarlo",
    href: "/login",
    variant: "danger",
  },
  oauth_redirect_uri: {
    title: "No se ha podido completar el acceso",
    message: "La conexión ha sido rechazada. Vuelve al inicio e inténtalo de nuevo.",
    action: "Volver al acceso",
    href: "/login",
    variant: "danger",
  },
  oauth_no_url: {
    title: "Google no está disponible ahora",
    message: "No hemos podido iniciar la conexión. Inténtalo de nuevo dentro de unos minutos.",
    action: "Volver a intentarlo",
    href: "/login",
    variant: "danger",
  },
  callback: {
    title: "No hemos podido iniciar tu sesión",
    message: "La conexión no se ha completado. Vuelve a intentarlo desde la pantalla de acceso.",
    action: "Volver al acceso",
    href: "/login",
    variant: "danger",
  },
  callback_redirect_uri: {
    title: "No hemos podido iniciar tu sesión",
    message: "La conexión no se ha completado. Vuelve a intentarlo desde la pantalla de acceso.",
    action: "Volver al acceso",
    href: "/login",
    variant: "danger",
  },
  callback_code_expired: {
    title: "El acceso ha caducado",
    message:
      "Ha pasado demasiado tiempo durante el inicio de sesión. Empieza de nuevo para continuar.",
    action: "Volver a intentarlo",
    href: "/login",
    variant: "warning",
  },
  callback_google: {
    title: "Google no ha completado el acceso",
    message: "La conexión se ha interrumpido o cancelado. Puedes volver a intentarlo.",
    action: "Volver a intentarlo",
    href: "/login",
    variant: "danger",
  },
  callback_validation: {
    title: "No hemos podido validar tu acceso",
    message: "La sesión recibida no es válida o ha caducado. Inicia el proceso otra vez.",
    action: "Volver a intentarlo",
    href: "/login",
    variant: "danger",
  },
  oauth: {
    title: "No hemos podido conectar con Google",
    message: "Ha ocurrido un problema temporal. Inténtalo otra vez y, si continúa, avisa al club.",
    action: "Volver a intentarlo",
    href: "/login",
    variant: "danger",
  },
  pending_request: {
    title: "Tu solicitud está pendiente",
    message: "Ya la hemos recibido. Podrás entrar cuando el club la apruebe.",
    action: "Entendido",
    href: "/login",
    variant: "info",
  },
};

export function AuthErrorBanner({ code }: AuthErrorBannerProps) {
  if (!code) return null;
  const copy = COPY[code] ?? COPY.oauth;

  return (
    <Alert
      variant={copy.variant}
      title={copy.title}
      className="gap-3 p-4 text-left text-sm leading-relaxed"
    >
      <p>{copy.message}</p>
      <Link
        href={copy.href}
        className="focus-visible:ring-pool-blue inline-flex min-h-11 w-fit touch-manipulation items-center justify-center rounded-xl border border-current px-4 text-sm font-extrabold transition-[background-color,color] focus-visible:ring-2 focus-visible:outline-none motion-reduce:transition-none"
      >
        {copy.action}
      </Link>
    </Alert>
  );
}
