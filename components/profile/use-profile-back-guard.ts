"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";

export function useProfileBackGuard(onBack: () => void) {
  const router = useRouter();
  const callback = useRef(onBack);
  const destination = useRef<string | null>(null);
  const armed = useRef(false);
  useEffect(() => {
    callback.current = onBack;
  }, [onBack]);
  useEffect(() => {
    const path = window.location.pathname + window.location.search;
    const arm = () =>
      window.history.pushState({ ...window.history.state, profileBackGuard: path }, "", path);
    if (window.history.state?.profileBackGuard !== path) arm();
    armed.current = true;
    const back = () => {
      if (window.location.pathname + window.location.search !== path) return;
      if (destination.current) {
        const target = destination.current;
        destination.current = null;
        armed.current = false;
        router.replace(target as Route);
        return;
      }
      arm();
      callback.current();
    };
    window.addEventListener("popstate", back);
    return () => {
      armed.current = false;
      window.removeEventListener("popstate", back);
    };
  }, [router]);
  return (target: string) => {
    if (destination.current) return;
    if (!armed.current) {
      router.replace(target as Route);
      return;
    }
    destination.current = target;
    window.history.back();
  };
}
