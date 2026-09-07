"use client";

import { useEffect, useRef, useState } from "react";
import { loadLiveMatch, syncLiveMatch } from "@/server/actions/live-match";
import { sheetSchema, type LiveSheet } from "@/lib/domain/live-match";
import {
  liveDevice,
  readLocalMatch,
  writeLocalMatch,
  type StoredMatch,
} from "@/lib/pwa/live-match-store";

export function useLiveMatch() {
  const [record, setRecord] = useState<StoredMatch>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [writable, setWritable] = useState(false);
  const [online, setOnline] = useState(true);
  const current = useRef<StoredMatch>(undefined);
  const running = useRef(false);
  const writeQueue = useRef(Promise.resolve());
  const canWrite = useRef(false);
  const syncRef = useRef<() => Promise<void>>(async () => {});

  function persist(next: StoredMatch) {
    const task = writeQueue.current.then(async () => {
      await writeLocalMatch(next);
      current.current = next;
      setRecord(next);
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
          r = { ...r, flight: { sheet: r.sheet, mutation: r.mutation, revision: r.revision } };
          await persist(r);
        }
        const flight = r.flight!;
        const result = await syncLiveMatch({ matchId: r.matchId, device: liveDevice(), ...flight });
        if (!result.ok) throw new Error(result.error);
        const saved = result.data;
        await writeQueue.current;
        const latest = current.current!;
        await persist({
          ...latest,
          revision: saved.revision,
          owner: saved.owner,
          device: liveDevice(),
          dirty: latest.mutation !== flight.mutation,
          flight: undefined,
        });
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
      if (!navigator.locks)
        throw new Error("Usa una versión actual de Safari o Chrome para anotar con seguridad.");
      void navigator.locks
        .request(`acta:${id}`, { signal: controller.signal }, async (lock) => {
          try {
            clearTimeout(lockTimeout);
            if (stopped) return;
            const cached = await readLocalMatch(id!);
            let next = cached;
            if (navigator.onLine) {
              const result = await loadLiveMatch(id!).catch(() => null);
              if (result && !result.ok) throw new Error(result.error);
              if (result?.ok) {
                const remote = result.data;
                if(cached && (cached.dirty || cached.flight) && cached.viewer!==remote.viewer) throw new Error("Este móvil tiene jugadas pendientes de otra sesión. Vuelve a esa cuenta para enviarlas antes de abrir el acta aquí.");
                if (cached && (cached.dirty || cached.flight) && cached.viewer === remote.viewer)
                  next = { ...cached, canEdit: remote.canEdit };
                else
                  next = {
                    ...remote,
                    device: remote.device || liveDevice(),
                    dirty: remote.revision === 0,
                    mutation: remote.mutation || crypto.randomUUID(),
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
        })
        .catch(() => {
          if (!stopped)
            setError(
              "Este partido está abierto en otra pestaña. Ciérrala y vuelve a abrir el acta aquí.",
            );
        });
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
    if (!canWrite.current || busy) return false;
    setBusy(true);
    try {
      const parsed = sheetSchema.parse(sheet);
      await writeQueue.current;
      await persist({
        ...current.current!,
        sheet: parsed,
        mutation: crypto.randomUUID(),
        dirty: true,
      });
      setError("");
      void syncRef.current();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar la jugada.");
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function takeover() {
    setBusy(true);
    try {
      const loaded = await loadLiveMatch(current.current!.matchId);
      if (!loaded.ok) throw new Error(loaded.error);
      const remote = loaded.data;
      const mutation = crypto.randomUUID();
      const saved = await syncLiveMatch({
        matchId: remote.matchId,
        device: liveDevice(),
        revision: remote.revision,
        mutation,
        sheet: remote.sheet,
        takeover: true,
      });
      if (!saved.ok) throw new Error(saved.error);
      const result = saved.data;
      await persist({
        ...remote,
        device: liveDevice(),
        owner: result.owner,
        revision: result.revision,
        mutation,
      });
      location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos tomar el relevo.");
    } finally {
      setBusy(false);
    }
  }
  return { record, error, busy, writable, online, change, retry: sync, takeover };
}
