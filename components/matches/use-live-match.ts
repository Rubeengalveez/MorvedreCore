"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { loadLiveMatch, syncLiveMatch, type ActaPreparation } from "@/server/actions/live-match";
import {
  acknowledgeLiveFlight,
  prepareLiveFlight,
  requestWithActaDeadline,
} from "@/lib/pwa/live-match-sync";
import { identifyLiveSheet } from "@/lib/domain/live-match-identity";
import type { LiveSheet } from "@/lib/domain/live-match";
import { validateTimeoutChanges } from "@/lib/domain/live-match-timeouts";
import { prepareParticipation } from "@/lib/domain/live-match-participation";
import type { LineupDraft } from "@/lib/domain/live-match-rules";
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

  function persist(
    next: StoredMatch | ((latest: StoredMatch) => StoredMatch),
    expected?: { mutation: string; draftRevision: number },
  ) {
    const task = writeQueue.current.then(async () => {
      const value = typeof next === "function" ? next(current.current!) : next;
      const previous = current.current!;
      const guard =
        expected ??
        (canWrite.current
          ? { mutation: previous.mutation, draftRevision: previous.draftRevision ?? 0 }
          : undefined);
      try {
        await writeLocalMatch(value, guard);
      } catch (failure) {
        if (guard) {
          const latest = await readLocalMatch(previous.matchId).catch(() => undefined);
          if (latest && latest.viewer === previous.viewer && latest.device === previous.device) {
            current.current = latest;
            setRecord(latest);
          }
        }
        throw failure;
      }
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
      while ((r?.dirty || r?.flight) && navigator.onLine && canWrite.current) {
        if (!r.flight) {
          await persist(prepareLiveFlight);
          r = current.current!;
        }
        const flight = r.flight!;
        const result = await requestWithActaDeadline(
          syncLiveMatch({ matchId: r.matchId, device: liveDevice(), ...flight }),
        );
        if (!canWrite.current) return;
        if (!result.ok) throw new Error(result.error);
        const saved = result.data;
        await writeQueue.current;
        if (!canWrite.current) return;
        await persist((latest) => acknowledgeLiveFlight(latest, flight, saved, liveDevice()));
        setError("");
        r = current.current;
      }
    } catch (e) {
      if (!canWrite.current) return;
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
          if (stopped) return;
          let next = cached;
          if (navigator.onLine) {
            const result = await requestWithActaDeadline(loadLiveMatch(id!)).catch(() => null);
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
                next = {
                  ...cached,
                  sheet: prepareParticipation(cached.sheet, remote.sheet.category),
                  canEdit: remote.canEdit,
                  callupCandidates: remote.callupCandidates ?? cached.callupCandidates,
                  callupTemplate: remote.callupTemplate ?? cached.callupTemplate,
                };
              else if (cached?.takeoverFlight && cached.viewer === remote.viewer)
                next =
                  remote.device === liveDevice() &&
                  remote.mutation === cached.takeoverFlight.mutation
                    ? { ...remote, takeoverFlight: undefined }
                    : { ...remote, takeoverFlight: cached.takeoverFlight };
              else
                next = {
                  ...remote,
                  lineupDraft:
                    cached?.viewer === remote.viewer &&
                    cached.device === remote.device &&
                    cached.mutation === remote.mutation &&
                    cached.revision === remote.revision
                      ? cached.lineupDraft
                      : undefined,
                  draftRevision: cached?.draftRevision ?? 0,
                  device: remote.device || liveDevice(),
                  dirty: remote.revision === 0,
                  mutation: remote.mutation || generateUuid(),
                };
            } else if (!cached)
              throw new Error("No hay conexión. Abre el partido con internet para prepararlo.");
          }
          if (!next)
            throw new Error("Abre este partido con conexión una vez para prepararlo en el móvil.");
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
          if (!stopped) setError(e instanceof Error ? e.message : "No pudimos abrir el acta.");
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
    void init().catch((e) => {
      if (!stopped) setError(e.message);
    });
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
      canWrite.current = false;
      controller.abort();
      clearTimeout(lockTimeout);
      void writeQueue.current.then(() => release());
      clearInterval(timer);
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
      document.removeEventListener("visibilitychange", connection);
    };
  }, []);

  async function change(
    sheet: LiveSheet,
    options?: { rosterEdit?: true; expectedDraftRevision?: number },
  ) {
    if (!canWrite.current || localWriting.current) return false;
    localWriting.current = true;
    setBusy(true);
    try {
      validateTimeoutChanges(sheet, current.current?.sheet);
      const parsed = identifyLiveSheet(sheet, current.current?.sheet);
      await writeQueue.current;
      const latest = current.current!;
      const expected = {
        mutation: latest.mutation,
        draftRevision: options?.expectedDraftRevision ?? latest.draftRevision ?? 0,
      };
      if ((latest.draftRevision ?? 0) !== expected.draftRevision)
        throw new Error(
          "La selección ha cambiado. Cierra la lista y vuelve a abrirla antes de guardar.",
        );
      await persist(
        (latest) => ({
          ...latest,
          sheet: parsed,
          lineupDraft: undefined,
          draftRevision: expected.draftRevision + 1,
          mutation: generateUuid(),
          dirty: true,
          rosterEdit: options?.rosterEdit || latest.rosterEdit,
        }),
        expected,
      );
      setError("");
      void syncRef.current();
      return true;
    } catch (e) {
      setError(
        e instanceof z.ZodError
          ? (e.issues.find((issue) => issue.code === "custom")?.message ??
              "Revisa los datos de la jugada. No se ha guardado este cambio.")
          : e instanceof Error
            ? e.message
            : "No pudimos guardar la jugada.",
      );
      return false;
    } finally {
      localWriting.current = false;
      setBusy(false);
    }
  }
  async function takeover() {
    setBusy(true);
    try {
      const loaded = await requestWithActaDeadline(loadLiveMatch(current.current!.matchId));
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
      const attempt = previousAttempt ?? {
        mutation: generateUuid(),
        revision: remote.revision,
        sheet: remote.sheet,
      };
      if (!previousAttempt) {
        await persist((latest) => ({ ...latest, takeoverFlight: attempt }));
      }
      const saved = await requestWithActaDeadline(
        syncLiveMatch({
          matchId: remote.matchId,
          device: liveDevice(),
          revision: attempt.revision,
          mutation: attempt.mutation,
          sheet: attempt.sheet,
          takeover: true,
        }),
      );
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
  async function saveLineupDraft(draft: LineupDraft) {
    if (!canWrite.current) return false;
    try {
      await writeQueue.current;
      const latest = current.current!;
      const expected = {
        mutation: draft.baseMutation,
        draftRevision: draft.baseDraftRevision ?? latest.draftRevision ?? 0,
      };
      if (
        latest.mutation !== expected.mutation ||
        (latest.draftRevision ?? 0) !== expected.draftRevision
      )
        throw new Error(
          "La selección ha cambiado. Cierra la lista y vuelve a abrirla antes de guardar.",
        );
      await persist(
        (currentRecord) => ({
          ...currentRecord,
          lineupDraft: draft,
          draftRevision: expected.draftRevision + 1,
        }),
        expected,
      );
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar la selección en este móvil.");
      return false;
    }
  }
  return {
    record,
    error,
    preparation,
    busy,
    writable,
    online,
    change,
    saveLineupDraft,
    retry: sync,
    takeover,
  };
}
