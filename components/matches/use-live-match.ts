"use client";

import { useEffect, useRef, useState } from "react";
import { loadLiveMatch, syncLiveMatch, type ActaPreparation } from "@/server/actions/live-match";
import { sheetSchema, type LiveSheet } from "@/lib/domain/live-match";
import {
  liveDevice,
  readLocalMatch,
  writeLocalMatch,
  type StoredMatch,
} from "@/lib/pwa/live-match-store";
import { generateUuid } from "@/lib/utils/uuid";

export function useLiveMatch() {
  const [record, setRecord] = useState<StoredMatch>();
  const [error, setError] = useState("");
  const [preparation, setPreparation] = useState<ActaPreparation>();
  const [busy, setBusy] = useState(false);
  const [writable, setWritable] = useState(false);
  const [online, setOnline] = useState(true);
  const current = useRef<StoredMatch>(undefined);
  const running = useRef(false);
  const localWriting = useRef(false);
  const writeQueue = useRef(Promise.resolve());
  const canWrite = useRef(false);
  const syncRef = useRef<() => Promise<void>>(async () => {});

  function persist(next: StoredMatch | ((latest: StoredMatch) => StoredMatch)) {
    const task = writeQueue.current.then(async () => {
      const value = typeof next === "function" ? next(current.current!) : next;
      await writeLocalMatch(value);
      current.current = value;
      setRecord(value);
    });
    writeQueue.current = task.catch(() => {});
    return task;
  }
  async function sync() {
    if (running.current || !navigator.onLine || !canWrite.current) return;
    running.current = true;
    try {
      await writeQueue.current;
      let r = current.current;
      while (r?.dirty || r?.flight) {
        if (!r.flight) {
          await persist((latest) => ({
            ...latest,
            flight: latest.flight ?? {
              sheet: latest.sheet,
              mutation: latest.mutation,
              revision: latest.revision,
            },
          }));
          r = current.current!;
        }
        const flight = r.flight!;
        const result = await syncLiveMatch({ matchId: r.matchId, device: liveDevice(), ...flight });
        if (!result.ok) throw new Error(result.error);
        const saved = result.data;
        await writeQueue.current;
        await persist((latest) => ({
          ...latest,
          revision: saved.revision,
          owner: saved.owner,
          device: liveDevice(),
          dirty: latest.mutation !== flight.mutation,
          flight: undefined,
        }));
        setError("");
        r = current.current;
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No pudimos sincronizar. Tus jugadas siguen en este móvil.",
      );
    } finally {
      running.current = false;
    }
  }
  useEffect(() => {
    syncRef.current = sync;
  });

  useEffect(() => {
    let release: () => void = () => {};
    let stopped = false;
    const controller = new AbortController();
    const lockTimeout = setTimeout(() => controller.abort(), 15000);
    const id = new URLSearchParams(location.search).get("match");
    if (!id) {
      queueMicrotask(() => setError("Abre un partido desde la aplicación para registrar su acta."));
      return;
    }
    async function init() {
      const runner = async (lock: unknown) => {
        try {
          clearTimeout(lockTimeout);
          if (stopped) return;
          const cached = await readLocalMatch(id!);
          let next = cached;
          if (navigator.onLine) {
            const result = await loadLiveMatch(id!).catch(() => null);
            if (result && !result.ok) {
              if (result.preparation) setPreparation(result.preparation);
              throw new Error(result.error);
            }
            if (result?.ok) {
              const remote = result.data;
              if (
                cached &&
                (cached.dirty || cached.flight || cached.takeoverFlight) &&
                cached.viewer !== remote.viewer
              )
                throw new Error(
                  "Este móvil tiene jugadas pendientes de otra sesión. Vuelve a esa cuenta para enviarlas antes de abrir el acta aquí.",
                );
              if (cached && (cached.dirty || cached.flight) && cached.viewer === remote.viewer)
                next = { ...cached, canEdit: remote.canEdit };
              else if (cached?.takeoverFlight && cached.viewer === remote.viewer)
                next =
                  remote.device === liveDevice() &&
                  remote.mutation === cached.takeoverFlight.mutation
                    ? { ...remote, takeoverFlight: undefined }
                    : { ...remote, takeoverFlight: cached.takeoverFlight };
              else
                next = {
                  ...remote,
                  device: remote.device || liveDevice(),
                  dirty: remote.revision === 0,
                  mutation: remote.mutation || generateUuid(),
                };
            } else if (!cached)
              throw new Error("No hay conexión. Abre el partido con internet para prepararlo.");
          }
          if (!next)
            throw new Error(
              "Abre este partido con conexión una vez para prepararlo en el móvil.",
            );
          if (stopped) return;
          current.current = next;
          setRecord(next);
          if (!lock) {
            setError("Este partido está abierto en otra pestaña. Ciérrala para anotar aquí.");
            return;
          }
          await persist(next);
          localStorage.setItem("morvedre-last-acta", next.matchId);
          if (stopped) return;
          if (!next.canEdit || (next.revision > 0 && next.device !== liveDevice())) return;
          canWrite.current = true;
          setWritable(true);
          void syncRef.current();
          void navigator.storage?.persist?.();
          await new Promise<void>((resolve) => {
            release = resolve;
          });
          canWrite.current = false;
        } catch (e) {
          setError(e instanceof Error ? e.message : "No pudimos abrir el acta.");
        }
      };

      if (typeof navigator !== "undefined" && navigator.locks) {
        void navigator.locks
          .request(`acta:${id}`, { signal: controller.signal }, runner)
          .catch(() => {
            if (!stopped)
              setError(
                "Este partido está abierto en otra pestaña. Ciérrala y vuelve a abrir el acta aquí.",
              );
          });
      } else {
        void runner({ name: `acta:${id}` });
      }
    }
    void init().catch((e) => setError(e.message));
    function connection() {
      setOnline(navigator.onLine);
      void syncRef.current();
    }
    queueMicrotask(connection);
    const timer = setInterval(() => void syncRef.current(), 10000);
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    document.addEventListener("visibilitychange", connection);
    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(lockTimeout);
      release();
      clearInterval(timer);
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
      document.removeEventListener("visibilitychange", connection);
    };
  }, []);

  async function change(sheet: LiveSheet) {
    if (!canWrite.current || localWriting.current) return false;
    localWriting.current = true;
    setBusy(true);
    try {
      const checked = sheetSchema.safeParse({ ...sheet, version: 2 });
      if (!checked.success)
        throw new Error(checked.error.issues[0]?.message ?? "Revisa la jugada.");
      const parsed = checked.data;
      await writeQueue.current;
      await persist((latest) => ({
        ...latest,
        sheet: parsed,
        mutation: generateUuid(),
        dirty: true,
      }));
      setError("");
      void syncRef.current();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar la jugada.");
      return false;
    } finally {
      localWriting.current = false;
      setBusy(false);
    }
  }
  async function takeover() {
    setBusy(true);
    try {
      const loaded = await loadLiveMatch(current.current!.matchId);
      if (!loaded.ok) throw new Error(loaded.error);
      const remote = loaded.data;
      const previousAttempt = current.current?.takeoverFlight;
      if (
        previousAttempt &&
        remote.device === liveDevice() &&
        remote.mutation === previousAttempt.mutation
      ) {
        await persist({ ...remote, takeoverFlight: undefined });
        location.reload();
        return;
      }
      const attempt =
        previousAttempt ?? {
          mutation: generateUuid(),
          revision: remote.revision,
          sheet: remote.sheet,
        };
      if (!previousAttempt) {
        await persist((latest) => ({ ...latest, takeoverFlight: attempt }));
      }
      const saved = await syncLiveMatch({
        matchId: remote.matchId,
        device: liveDevice(),
        revision: attempt.revision,
        mutation: attempt.mutation,
        sheet: attempt.sheet,
        takeover: true,
      });
      if (!saved.ok) throw new Error(saved.error);
      const result = saved.data;
      await persist({
        ...remote,
        device: liveDevice(),
        owner: result.owner,
        revision: result.revision,
        mutation: attempt.mutation,
        takeoverFlight: undefined,
      });
      location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos tomar el relevo.");
    } finally {
      setBusy(false);
    }
  }
  return { record, error, preparation, busy, writable, online, change, retry: sync, takeover };
}
