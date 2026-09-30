"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { syncLiveMatch } from "@/server/actions/live-match";
import {
  liveDevice,
  readLocalMatch,
  readPendingLocalMatches,
  writeLocalMatch,
} from "@/lib/pwa/live-match-store";
import {
  acknowledgeLiveFlight,
  prepareLiveFlight,
  requestWithActaDeadline,
} from "@/lib/pwa/live-match-sync";

export function ActaPendingSync({ viewer }: { viewer: string }) {
  const router = useRouter();
  useEffect(() => {
    let stopped = false;
    let running = false;
    async function run() {
      if (running || stopped || !navigator.onLine || !navigator.locks) return;
      running = true;
      let updated = false;
      try {
        const device = liveDevice();
        const pending = await readPendingLocalMatches(viewer, device);
        for (const record of pending) {
          if (stopped || !navigator.onLine) break;
          try {
            await navigator.locks.request(
              `acta:${record.matchId}`,
              { ifAvailable: true },
              async (lock) => {
                if (!lock || stopped || !navigator.onLine) return;
                const latest = await readLocalMatch(record.matchId);
                if (
                  !latest ||
                  latest.viewer !== viewer ||
                  latest.device !== device ||
                  !latest.canEdit ||
                  latest.takeoverFlight ||
                  (!latest.dirty && !latest.flight) ||
                  stopped
                )
                  return;
                const prepared = prepareLiveFlight(latest);
                await writeLocalMatch(prepared);
                const flight = prepared.flight!;
                const result = await requestWithActaDeadline(
                  syncLiveMatch({ matchId: record.matchId, device, ...flight }),
                );
                if (stopped || !result.ok) return;
                await writeLocalMatch(acknowledgeLiveFlight(prepared, flight, result.data, device));
                updated = true;
              },
            );
          } catch {
            continue;
          }
        }
      } catch {
        return;
      } finally {
        running = false;
        if (updated && !stopped) router.refresh();
      }
    }
    const check = () => {
      void run();
    };
    check();
    const timer = setInterval(check, 10000);
    window.addEventListener("online", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener("online", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [viewer, router]);
  return null;
}
