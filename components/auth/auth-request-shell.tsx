import Image from "next/image";
import Link from "next/link";
import { Clock, Mail, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { Route } from "next";

interface AuthRequestShellProps {
  children: ReactNode;
  title: string;
  subtitle?: ReactNode;
}

export function AuthRequestShell({ children, title, subtitle }: AuthRequestShellProps) {
  return (
    <div className="relative isolate flex min-h-svh flex-col items-center justify-start overflow-y-auto overflow-x-hidden bg-paper px-4 pb-6 pt-12 sm:px-6 sm:pt-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[62svh] rounded-b-[2.5rem] bg-[linear-gradient(180deg,#062048_0%,#1657a8_100%)] shadow-elev-2"
      />

      <div className="relative z-10 flex w-full max-w-[400px] flex-col items-center gap-6 sm:gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Image
            src="/brand/icon-192.png"
            alt="Escudo del Waterpolo Morvedre"
            width={160}
            height={160}
            priority
            className="h-[160px] w-[160px] rounded-full object-cover sm:h-[200px] sm:w-[200px]"
          />

          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-[36px] leading-none font-extrabold tracking-tight text-white drop-shadow-md sm:text-[44px]">
              Morvedre Core
            </h1>
            <span className="text-eyebrow text-sm tracking-wide text-white/75">
              Waterpolo Morvedre &middot; Temporada 24/25
            </span>
          </div>
        </div>

        <div className="w-full rounded-[var(--r-xl)] bg-paper-card p-6 shadow-elev-2 sm:p-8">
          <div className="mb-5">
            <h2 className="font-display text-pool-deep text-2xl font-extrabold">{title}</h2>
            {subtitle ? <p className="text-ink-600 mt-1 text-sm">{subtitle}</p> : null}
          </div>
          {children}
        </div>

        <p className="text-center text-xs text-ink-500">
          &iquest;Ya tienes cuenta?{" "}
          <Link
            href={"/login" as Route}
            className="font-semibold text-pool-blue hover:underline focus-visible:underline focus-visible:outline-none"
          >
            Entrar
          </Link>
        </p>

        <div className="w-full rounded-[var(--r-lg)] border border-ink-200 bg-paper-card/60 p-4">
          <h3 className="text-eyebrow text-ink-800 mb-3 text-xs font-semibold">
            &iquest;Qu&eacute; ocurre despu&eacute;s?
          </h3>
          <ul className="flex flex-col gap-2 text-xs text-ink-600">
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-pool-blue" aria-hidden="true" />
              <span>El club revisa y aprueba tu solicitud.</span>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-pool-blue" aria-hidden="true" />
              <span>Te enviamos una contrase&ntilde;a provisional.</span>
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-pool-blue" aria-hidden="true" />
              <span>Entras y cambias la contrase&ntilde;a por la tuya.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
