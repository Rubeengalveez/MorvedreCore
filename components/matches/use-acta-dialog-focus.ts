"use client";

import { useRef } from "react";

export function useActaDialogFocus() {
  const trigger = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: () => {
      trigger.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    },
    onCloseAutoFocus: (event: Event) => {
      if (trigger.current?.isConnected && trigger.current !== document.body) {
        event.preventDefault();
        trigger.current.focus({ preventScroll: true });
      }
    },
  };
}
