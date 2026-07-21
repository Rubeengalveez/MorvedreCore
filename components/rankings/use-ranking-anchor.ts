"use client";

import { useEffect, useState } from "react";

const PLAYER_ANCHOR_PREFIX = "ranking-player-";

export function useRankingAnchor(page: number): string | null {
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    function focusPlayer() {
      const anchor = window.location.hash.slice(1);
      if (!anchor.startsWith(PLAYER_ANCHOR_PREFIX)) {
        setPlayerId(null);
        return;
      }

      const nextPlayerId = anchor.slice(PLAYER_ANCHOR_PREFIX.length);
      setPlayerId(nextPlayerId);
      window.requestAnimationFrame(() => {
        document.getElementById(anchor)?.scrollIntoView({
          block: "center",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        });
      });
    }

    focusPlayer();
    window.addEventListener("hashchange", focusPlayer);
    return () => window.removeEventListener("hashchange", focusPlayer);
  }, [page]);

  return playerId;
}
