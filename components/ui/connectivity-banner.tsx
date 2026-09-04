"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { WifiOff, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export function useIsOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function ConnectivityBanner() {
  const isOnline = useIsOnline();
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowReconnected(false);
    } else if (wasOffline) {
      setShowReconnected(true);
      const timer = window.setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 2500);
      return () => window.clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      className={cn(
        "fixed top-[var(--top-bar-height,0px)] right-0 left-0 z-50 flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold shadow-elev-2 transition-all duration-300",
        !isOnline
          ? "bg-pool-deep text-paper border-b border-ball-gold"
          : "bg-success text-paper border-b border-success/30",
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="text-ball-gold h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Sin conexión a internet · Modo solo lectura</span>
        </>
      ) : (
        <>
          <CheckCircle2 className="h-4 w-4 shrink-0 text-white" aria-hidden="true" />
          <span>Conexión restablecida</span>
        </>
      )}
    </aside>
  );
}
