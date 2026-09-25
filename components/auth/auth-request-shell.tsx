import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import type { Route } from "next";

interface AuthRequestShellProps {
  children: ReactNode;
  title: string;
  subtitle?: ReactNode;
  showNextSteps?: boolean;
  backHref?: Route;
  backLabel?: string;
}

export function AuthRequestShell({
  children, title, subtitle, showNextSteps = false,
  backHref = "/login/request" as Route, backLabel = "Volver a elegir",
}: AuthRequestShellProps) {
  return (
    <div className="bg-paper relative isolate flex min-h-svh flex-col items-center overflow-x-hidden px-4 pt-4 pb-6 sm:px-6 sm:pt-10">
      <div aria-hidden="true"
        className="shadow-elev-2 pointer-events-none absolute inset-x-0 top-0 h-[43svh] rounded-b-[2rem] bg-[linear-gradient(180deg,#062048_0%,#1657a8_100%)]" />
      <div className="relative z-10 flex w-full max-w-[400px] flex-col gap-3">
        <Link href={backHref}
          className="focus-visible:ring-ball-gold inline-flex min-h-12 w-fit items-center gap-2 rounded-xl px-1 pr-3 text-sm font-bold text-white hover:text-white/80 focus-visible:ring-2 focus-visible:outline-none">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />{backLabel}
        </Link>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <Image src="/brand/icon-192.png" alt="Escudo del Waterpolo Morvedre"
            width={120} height={120} priority
            className={`${showNextSteps ? "h-[104px] w-[104px]" : "h-[72px] w-[72px]"} rounded-full object-cover sm:h-[124px] sm:w-[124px]`} />
          <p className="font-display text-2xl leading-none font-extrabold tracking-tight text-white drop-shadow-md sm:text-3xl">
            Morvedre Core
          </p>
        </div>
        <main className="bg-paper-card shadow-elev-2 w-full rounded-[var(--r-xl)] p-5 sm:p-7">
          <div className="mb-4">
            <h1 className="font-display text-pool-deep text-[22px] leading-tight font-extrabold">{title}</h1>
            {subtitle ? <p className="text-ink-700 mt-1 text-sm leading-snug">{subtitle}</p> : null}
          </div>
          {children}
          {showNextSteps ? <div className="bg-pool-foam/55 mt-4 rounded-xl p-3">
            <h2 className="text-pool-deep text-sm font-extrabold">Qué ocurre después</h2>
            <p className="text-ink-700 mt-1 text-sm leading-snug">
              Revisamos tu solicitud y te damos acceso con Google o una contraseña provisional.
            </p>
          </div> : null}
        </main>
        <p className="text-ink-700 mt-1 text-center text-sm">
          ¿Ya tienes cuenta?{" "}
          <Link href={"/login" as Route}
            className="text-pool-blue inline-flex min-h-12 items-center font-extrabold hover:underline focus-visible:underline focus-visible:outline-none">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
