"use client";

import { useEffect, useRef } from "react";

export function useActaBackGuard(onBack: () => void, enabled: boolean) {
  const onBackRef = useRef(onBack);
  const exitTargetRef = useRef<string | null>(null);
  const armedRef = useRef(false);

  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  useEffect(() => {
    if (!enabled) return;
    const path = window.location.pathname + window.location.search;
    const marker = window.history.state?.actaBackGuard;
    if (marker !== path) {
      window.history.pushState(
        { ...window.history.state, actaBackGuard: path },
        "",
        window.location.href,
      );
    }
    armedRef.current = true;

    function handlePopState() {
      const exitTarget = exitTargetRef.current;
      if (exitTarget) {
        exitTargetRef.current = null;
        window.location.replace(exitTarget);
        return;
      }
      if (window.location.pathname + window.location.search !== path) return;
      window.history.pushState(
        { ...window.history.state, actaBackGuard: path },
        "",
        window.location.href,
      );
      onBackRef.current();
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      armedRef.current = false;
      window.removeEventListener("popstate", handlePopState);
    };
  }, [enabled]);

  return (target: string) => {
    if (exitTargetRef.current) return;
    if (!armedRef.current) {
      window.location.replace(target);
      return;
    }
    exitTargetRef.current = target;
    window.history.back();
  };
}
