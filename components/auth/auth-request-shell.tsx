import Link from "next/link";
import { ArrowLeft, Clock3, KeyRound, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { Route } from "next";

import { AuthLogo } from "@/components/auth/auth-logo";

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
          <AuthLogo />
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
        </main>
        {showNextSteps ? <section aria-labelledby="next-steps-title"
          className="bg-paper-card/95 border-pool-blue/20 rounded-[var(--r-lg)] border p-4 shadow-sm">
          <h2 id="next-steps-title" className="text-pool-deep font-display text-base font-extrabold">¿Qué ocurre después?</h2>
          <ol className="text-ink-700 mt-3 flex flex-col gap-3 text-sm leading-snug">
            <li className="flex items-start gap-3"><Clock3 className="text-pool-blue mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <span>El club revisa tu solicitud y comprueba tus datos.</span></li>
            <li className="flex items-start gap-3"><ShieldCheck className="text-pool-blue mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <span>Cuando la aprobemos, podrás acceder a tu perfil.</span></li>
            <li className="flex items-start gap-3"><KeyRound className="text-pool-blue mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <span>Con Google, vuelves a entrar. Con correo, recibes una contraseña provisional y la cambias al entrar.</span></li>
          </ol>
        </section> : null}
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
