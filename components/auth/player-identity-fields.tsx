"use client";

import { useRef, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2, MessageCircle } from "lucide-react";

import { Input } from "@/components/ui/input";
import { checkPlayerIdentity } from "@/server/actions/auth";
import { supportWhatsAppUrl } from "@/lib/auth/support";

type LookupState = "idle" | "found" | "missing" | "limited";

export function PlayerIdentityFields({
  idPrefix, fullName, birthYear, onNameChange, onYearChange, forParent, supportMessage,
}: {
  idPrefix: string;
  fullName: string;
  birthYear: string;
  onNameChange: (value: string) => void;
  onYearChange: (value: string) => void;
  forParent: boolean;
  supportMessage: string;
}) {
  const [status, setStatus] = useState<LookupState>("idle");
  const [pending, startTransition] = useTransition();
  const lastChecked = useRef("");
  const requestNumber = useRef(0);

  function clearLookup() {
    requestNumber.current += 1;
    lastChecked.current = "";
    setStatus("idle");
  }

  function check() {
    const name = fullName.trim();
    const year = Number(birthYear);
    if (name.length < 5 || !Number.isInteger(year) || year < 1900 || year > new Date().getFullYear()) return;
    const key = `${name.toLocaleLowerCase("es")}\u0000${year}`;
    if (key === lastChecked.current) return;
    lastChecked.current = key;
    const currentRequest = ++requestNumber.current;
    startTransition(async () => {
      try {
        const result = await checkPlayerIdentity({ fullName: name, birthYear: year, forParent });
        if (currentRequest === requestNumber.current) setStatus(result);
      } catch {
        if (currentRequest === requestNumber.current) setStatus("limited");
      }
    });
  }

  const helpId = `${idPrefix}-lookup`;
  return <div className="flex flex-col gap-3">
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${idPrefix}-name`} className="text-eyebrow text-ink-700">Nombre completo del jugador</label>
      <Input id={`${idPrefix}-name`} name={forParent ? undefined : "fullName"}
        type="text" autoComplete={forParent ? "off" : "name"} required minLength={5} maxLength={100}
        placeholder="Ej. María Pérez García" value={fullName}
        aria-invalid={status === "missing"}
        aria-describedby={status !== "idle" || pending ? helpId : undefined}
        onChange={(event) => { clearLookup(); onNameChange(event.target.value); }} onBlur={check}
        className="bg-pool-ice focus:border-pool-blue focus:bg-paper min-h-[52px] rounded-[var(--r-sm)] border-transparent px-4" />
    </div>
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`${idPrefix}-year`} className="text-eyebrow text-ink-700">Año de nacimiento</label>
      <Input id={`${idPrefix}-year`} name={forParent ? undefined : "birthYear"}
        type="number" inputMode="numeric" required min={1900} max={new Date().getFullYear()}
        placeholder="Ej. 2012" value={birthYear}
        aria-invalid={status === "missing"}
        aria-describedby={status !== "idle" || pending ? helpId : undefined}
        onChange={(event) => { clearLookup(); onYearChange(event.target.value); }} onBlur={check}
        className="bg-pool-ice focus:border-pool-blue focus:bg-paper min-h-[52px] rounded-[var(--r-sm)] border-transparent px-4" />
    </div>
    {(pending || status !== "idle") ? <div id={helpId} role={status === "missing" || status === "limited" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-xl border p-3 text-sm leading-snug ${status === "missing" || status === "limited" ? "border-danger/50 bg-red-50 text-ink-900" : "border-pool-teal/30 bg-pool-teal/10 text-pool-deep"}`}>
      {pending ? <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden="true" />
        : status === "found" ? <CheckCircle2 className="text-success h-5 w-5 shrink-0" aria-hidden="true" />
        : <AlertCircle className="text-danger h-5 w-5 shrink-0" aria-hidden="true" />}
      <span>{pending ? "Buscando jugador…"
        : status === "found" ? <><strong>Jugador encontrado.</strong> Ya puedes enviar la solicitud.</>
        : status === "limited" ? <><strong>No podemos comprobarlo ahora.</strong> Inténtalo más tarde o pide ayuda.</>
        : <><strong>No encontramos al jugador.</strong> Revisa que el nombre esté bien escrito y completo y que el año de nacimiento sea correcto.</>}</span>
    </div> : null}
    {(status === "missing" || status === "limited") ? <a href={supportWhatsAppUrl(supportMessage)}
      target="_blank" rel="noopener noreferrer"
      className="border-pool-blue text-pool-deep hover:bg-pool-foam focus-visible:ring-pool-blue inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 bg-white px-3 py-2 text-center text-sm font-bold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none">
      <MessageCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
      ¿Lo has revisado? Pide ayuda por WhatsApp
    </a> : null}
  </div>;
}
