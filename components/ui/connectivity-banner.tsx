"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
  const [showReconnected, setShowReconnected] = useState(false);
  const wasOfflineRef = useRef(!isOnline);

  useEffect(() => {
    let timer: number | undefined;

    function handleOffline() {
      wasOfflineRef.current = true;
      setShowReconnected(false);
    }

    function handleOnline() {
      if (!wasOfflineRef.current) return;
      setShowReconnected(true);
      timer = window.setTimeout(() => {
        setShowReconnected(false);
        wasOfflineRef.current = false;
      }, 2500);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      className={cn(
        "fixed top-[var(--top-bar-height,0px)] right-0 left-0 z-50 flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold shadow-elev-2 transition-colors duration-300",
        !isOnline
          ? "bg-pool-deep text-paper border-b border-ball-gold"
          : "bg-success text-paper border-b border-success/30",
      )}
    >
      {!isOnline ? (
        <>
          <WifiOff className="text-ball-gold h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Sin conexión · Algunas funciones no están disponibles</span>
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
