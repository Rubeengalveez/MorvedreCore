"use client";

import { useEffect, useRef, useState } from "react";
import { MdGetApp, MdClose, MdPhoneIphone } from "react-icons/md";
import { Button } from "@/components/ui/button";

const STORAGE_KEY_DISMISSED = "morvedre:pwa-install:dismissed-until";
const STORAGE_KEY_INSTALLED = "morvedre:pwa-install:installed";
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const IOS_SHOW_DELAY_MS = 3000;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function readDismissedUntil(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(STORAGE_KEY_DISMISSED);
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY_INSTALLED) === "1";
}

function writeDismissed(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY_DISMISSED, String(Date.now() + DISMISS_TTL_MS));
}

function writeInstalled(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY_INSTALLED, "1");
  window.localStorage.removeItem(STORAGE_KEY_DISMISSED);
}

function isStandaloneNow(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOSNow(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

export function PwaInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (hasFiredRef.current) return;
    hasFiredRef.current = true;

    if (isStandaloneNow() || readInstalled()) {
      writeInstalled();
      return;
    }
    if (readDismissedUntil() > Date.now()) return;

    const isApple = isIOSNow();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      if (readDismissedUntil() > Date.now() || readInstalled()) return;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (isApple) {
      const timer = window.setTimeout(() => {
        if (readDismissedUntil() > Date.now() || readInstalled()) return;
        setShowPrompt(true);
      }, IOS_SHOW_DELAY_MS);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  if (!showPrompt) return null;
  if (isStandaloneNow()) return null;

  const isIOS = isIOSNow();

  const [showIosModal, setShowIosModal] = useState(false);

  function dismiss(reason: "dismissed" | "installed") {
    setShowPrompt(false);
    setShowIosModal(false);
    if (reason === "installed") {
      writeInstalled();
    } else {
      writeDismissed();
    }
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosModal(true);
      return;
    }

    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") {
      dismiss("installed");
    } else {
      dismiss("dismissed");
    }
  };

  return (
    <>
      {showIosModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="bg-paper-card border-ink-200 shadow-elev-4 w-full max-w-sm rounded-lg border p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 id="ios-install-title" className="font-display text-pool-deep text-lg font-bold">
                Instalar en tu iPhone o iPad
              </h2>
              <button
                type="button"
                onClick={() => dismiss("dismissed")}
                className="text-ink-500 hover:text-ink-900 flex h-10 w-10 items-center justify-center rounded-full"
                aria-label="Cerrar instrucciones"
              >
                <MdClose className="h-5 w-5" />
              </button>
            </div>
            <ol className="text-ink-700 mt-4 space-y-3 text-sm leading-normal">
              <li className="flex items-start gap-2">
                <span className="bg-pool-foam text-pool-deep flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black">
                  1
                </span>
                <span>
                  Pulsa el botón de <strong>Compartir</strong> en la barra inferior de Safari (el icono de cuadro con flecha hacia arriba).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-pool-foam text-pool-deep flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black">
                  2
                </span>
                <span>
                  Baja por las opciones y toca en <strong>&ldquo;Añadir a la pantalla de inicio&rdquo;</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-pool-foam text-pool-deep flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black">
                  3
                </span>
                <span>
                  Pulsa <strong>Añadir</strong> en la esquina superior derecha.
                </span>
              </li>
            </ol>
            <Button
              variant="primary"
              size="md"
              onClick={() => dismiss("dismissed")}
              className="mt-5 w-full font-bold"
            >
              ¡Entendido!
            </Button>
          </div>
        </div>
      )}
      <div
        role="dialog"
        aria-label="Instalar Morvedre Core"
      className="border-pool-deep/20 bg-paper-card shadow-elev-4 fixed right-3 bottom-[calc(var(--bottom-nav-height)+8px)] left-3 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-md border p-3 backdrop-blur-md sm:right-6 sm:bottom-6 sm:left-6"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="bg-pool-blue text-paper flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
          {isIOS ? <MdPhoneIphone className="h-5 w-5" /> : <MdGetApp className="h-5 w-5" />}
        </span>
        <div className="min-w-0">
          <p className="font-display text-pool-deep text-sm font-bold">Instalar Morvedre Core</p>
          <p className="text-ink-600 truncate text-xs">
            {isIOS
              ? "Añádelo a tu inicio para usarlo como app"
              : "Instala la app en tu móvil en un clic"}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button size="sm" variant="primary" onClick={handleInstallClick} className="font-semibold">
          {isIOS ? "Ver cómo" : "Instalar"}
        </Button>
        <button
          type="button"
          onClick={() => dismiss("dismissed")}
          className="text-ink-600 hover:bg-pool-foam focus-visible:ring-pool-blue touch-target flex min-h-12 min-w-12 touch-manipulation items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
          aria-label="Cerrar aviso de instalación"
        >
          <MdClose className="h-5 w-5" />
        </button>
      </div>
    </div>
  </>
);
}
