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
  cta: { label: string; href: string };
  steps: string[];
}

const PROJECT_REF = "hzplkjtfejqfulhhnlya";
const SUPABASE_PROVIDERS = `https://supabase.com/dashboard/project/${PROJECT_REF}/auth/providers`;
const SUPABASE_URL_CONFIG = `https://supabase.com/dashboard/project/${PROJECT_REF}/auth/url-configuration`;

const COPY: Record<string, ErrorCopy> = {
  oauth_provider_disabled: {
    title: "Google no está activado en Supabase",
    message:
      "El login con Google falla porque el provider no está habilitado en tu proyecto de Supabase. Tienes que activarlo desde el panel.",
    cta: { label: "Abrir panel de Supabase", href: SUPABASE_PROVIDERS },
    steps: [
      "Entra a supabase.com/dashboard y abre tu proyecto.",
      "En el menú lateral: Authentication → Providers.",
      "Busca Google en la lista y actívalo (Enabled = ON).",
      "Pega el Client ID y Client Secret de Google Cloud.",
      "Guarda y vuelve a intentar el login.",
    ],
  },
  oauth_redirect_uri: {
    title: "URL de redirección no permitida",
    message: "Supabase no acepta la URL de callback. Falta añadirla a la whitelist de tu proyecto.",
    cta: { label: "Abrir URL Configuration", href: SUPABASE_URL_CONFIG },
    steps: [
      "Authentication → URL Configuration.",
      "En 'Redirect URLs' añade (uno por línea):",
      "  • http://localhost:3000/api/auth/callback",
      "  • http://localhost:3000/**",
      "Si usas un dominio de producción, añade también https://tu-dominio/api/auth/callback.",
    ],
  },
  callback_redirect_uri: {
    title: "Google volvió, pero la URL no está en la whitelist",
    message:
      "Google ha devuelto un código a tu app, pero Supabase lo rechaza porque la URL de callback no está permitida en este proyecto. Tienes que añadirla a la whitelist.",
    cta: { label: "Abrir URL Configuration", href: SUPABASE_URL_CONFIG },
    steps: [
      `Abre: ${SUPABASE_URL_CONFIG}`,
      "En 'Redirect URLs' AÑADE estas líneas (una por línea):",
      "  • http://localhost:3000/api/auth/callback",
      "  • http://localhost:3000/**",
      "Si tienes dominio de producción, añade también:",
      "  • https://tu-dominio/api/auth/callback",
      "Click SAVE abajo. Vuelve a intentar el login.",
    ],
  },
  callback_code_expired: {
    title: "El código de Google ha expirado",
    message:
      "Has tardado demasiado entre Google y la app (o diste atrás en el navegador). El código solo vale unos minutos. Vuelve a iniciar sesión.",
    cta: { label: "Reintentar", href: "/login" },
    steps: [
      "Pulsa 'Reintentar' y haz el flujo de Google en menos de 1 minuto.",
      "No pulses 'Atrás' del navegador después de autorizar en Google.",
    ],
  },
  callback_google: {
    title: "Google ha devuelto un error",
    message:
      "Google no ha completado el login. El error se ha logueado en la consola del servidor. Lo más común es que el Client ID/Secret de Supabase no coincide con el de Google Cloud.",
    cta: { label: "Verificar providers", href: SUPABASE_PROVIDERS },
    steps: [
      "Comprueba que en Supabase (Providers → Google) el Client ID es EXACTAMENTE:",
      "  186487279943-3b4kofs670q7iv4bn1dlj0kdoucnuoe9.apps.googleusercontent.com",
      "Y que en Google Cloud Console (Credentials) el Client ID es el mismo.",
      "Si no coinciden, copia el bueno en ambos sitios y guarda.",
    ],
  },
  callback_validation: {
    title: "Datos de login inválidos",
    message:
      "Supabase no ha podido validar el código de Google. Suele pasar si el Client ID/Secret de Supabase no coincide con el de Google Cloud, o si el proyecto de Supabase está mal configurado.",
    cta: { label: "Verificar providers", href: SUPABASE_PROVIDERS },
    steps: [
      `Ve a ${SUPABASE_PROVIDERS}`,
      "En la fila Google, click → verifica que 'Enabled' está ON.",
      "Comprueba que el Client ID/Secret coinciden con los de Google Cloud Console.",
      "Guarda y reintenta.",
    ],
  },
  callback: {
    title: "No pudimos completar el login",
    message:
      "Google ha vuelto a la app pero Supabase no ha validado el código. Suele pasar si el callback no está en la whitelist o si la sesión expiró.",
    cta: { label: "Reintentar", href: "/login" },
    steps: [
      "Pulsa 'Reintentar' y vuelve a iniciar sesión con Google.",
      `Si sigue fallando, abre ${SUPABASE_URL_CONFIG} y comprueba que 'http://localhost:3000/api/auth/callback' está en la lista.`,
    ],
  },
  oauth_no_url: {
    title: "Supabase no devolvió URL de OAuth",
    message:
      "El proyecto de Supabase no generó la URL de redirección a Google. Revisa que las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY sean correctas.",
    cta: { label: "Ver guía completa", href: "/docs/auth-setup-google" },
    steps: [
      "Abre .env.local y comprueba que NEXT_PUBLIC_SUPABASE_URL apunta a tu proyecto.",
      "Reinicia el servidor (Ctrl+C y pnpm dev).",
    ],
  },
  oauth: {
    title: "No pudimos iniciar sesión con Google",
    message:
      "Ha habido un error genérico con el proveedor. Prueba a reiniciar sesión o revisa la consola del navegador para más detalle.",
    cta: { label: "Reintentar", href: "/login" },
    steps: [
      "Abre la consola del navegador (F12) y mira si hay un error.",
      `Si es 400, probablemente falta configurar Google en ${SUPABASE_PROVIDERS}.`,
    ],
  },
  pending_request: {
    title: "Tu solicitud está pendiente",
    message:
      "Ya hemos recibido tu solicitud de acceso. El administrador del club debe aprobarla antes de que puedas entrar. Te avisará cuando esté lista.",
    cta: { label: "Entendido", href: "/login" },
    steps: ["Si llevas varios días esperando, escribe a galvillo9@gmail.com."],
  },
};

export function AuthErrorBanner({ code }: AuthErrorBannerProps) {
  if (!code) return null;
  const copy = COPY[code] ?? COPY.oauth;
  if (!copy) return null;
  return (
    <Alert
      variant="danger"
      title={copy.title}
      className="flex flex-col gap-2 p-3 text-left text-xs leading-relaxed"
    >
      <p>{copy.message}</p>
      <ol className="ml-4 list-decimal space-y-1">
        {copy.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <a
          href={copy.cta.href as Route}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-goggle-red text-paper shadow-elev-1 inline-flex h-9 items-center rounded-md px-3 text-[11px] font-extrabold hover:opacity-90"
        >
          {copy.cta.label} ↗
        </a>
        <Link
          href={"/docs/auth-setup-google" as Route}
          className="border-ink-300 bg-paper-card text-pool-deep hover:bg-pool-foam inline-flex h-9 items-center rounded-md border px-3 text-[11px] font-extrabold"
        >
          Guía paso a paso
        </Link>
      </div>
    </Alert>
  );
}
