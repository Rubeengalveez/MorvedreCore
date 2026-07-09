"use client";

import { MdCheckCircle, MdDescription, MdAutorenew, MdCloudUpload, MdCancel } from "react-icons/md";
import { useRef, useState, useTransition } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  commitImport,
  previewImport,
  type ImportPreview,
  type ImportResult,
  type PreviewRow,
} from "@/server/actions/admin";

type Phase = "idle" | "preview" | "committing" | "result";

export function ImportPlayersPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError(null);
    setPreview(null);
    setResult(null);
    setPhase("idle");
  }

  function handlePreview() {
    if (!file) return;
    setError(null);
    setResult(null);
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      try {
        const data = await previewImport(fd);
        setPreview(data);
        setPhase("preview");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pudimos leer el archivo.");
      }
    });
  }

  function handleCommit() {
    if (!file) return;
    setError(null);
    setPhase("committing");
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      try {
        const data = await commitImport(fd);
        setResult(data);
        setPhase("result");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pudimos importar.");
        setPhase("preview");
      }
    });
  }

  function handleReset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setPhase("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="border-ink-300 bg-paper rounded-md border p-5">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="bg-pool-foam text-pool-deep flex h-10 w-10 items-center justify-center rounded">
              <MdDescription className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="flex flex-1 flex-col">
              <h2 className="font-display text-pool-deep text-lg font-bold">
                Importar jugadores desde Excel
              </h2>
              <p className="text-ink-600 text-sm">
                Sube un archivo .xlsx con las columnas:{" "}
                <code className="bg-pool-foam rounded px-1 py-0.5 text-xs">nombre_completo</code>,{" "}
                <code className="bg-pool-foam rounded px-1 py-0.5 text-xs">ano_nacimiento</code>,{" "}
                <code className="bg-pool-foam rounded px-1 py-0.5 text-xs">dorsal</code>,{" "}
                <code className="bg-pool-foam rounded px-1 py-0.5 text-xs">nombre_equipo</code>,{" "}
                <code className="bg-pool-foam rounded px-1 py-0.5 text-xs">email_tutor</code>,{" "}
                <code className="bg-pool-foam rounded px-1 py-0.5 text-xs">nombre_tutor</code>,{" "}
                <code className="bg-pool-foam rounded px-1 py-0.5 text-xs">telefono_tutor</code>,{" "}
                <code className="bg-pool-foam rounded px-1 py-0.5 text-xs">relacion</code>.
              </p>
            </div>
          </div>

          <label className="border-ink-300 bg-paper hover:border-pool-blue hover:bg-pool-foam flex cursor-pointer flex-col items-center gap-2 rounded-md border-2 border-dashed p-6 text-center transition-colors">
            <MdCloudUpload className="text-ink-600 h-7 w-7" aria-hidden="true" />
            <span className="font-display text-pool-deep text-sm font-semibold">
              {file ? file.name : "Selecciona un archivo .xlsx"}
            </span>
            <span className="text-ink-600 text-xs">
              {file ? `${(file.size / 1024).toFixed(1)} KB` : "Tamaño máximo 5 MB"}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>

          {error ? (
            <Alert variant="danger" title="Error">
              {error}
            </Alert>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button size="md" disabled={!file || pending} onClick={handlePreview}>
              {pending && phase === "idle" ? (
                <MdAutorenew className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : null}
              Previsualizar
            </Button>
            {file ? (
              <Button size="md" variant="secondary" onClick={handleReset}>
                Cambiar archivo
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {phase === "preview" && preview ? (
        <PreviewSection preview={preview} onConfirm={handleCommit} pending={pending} />
      ) : null}

      {phase === "committing" ? (
        <Alert variant="info" title="Importando...">
          Estamos creando los perfiles. No cierres esta pantalla.
        </Alert>
      ) : null}

      {phase === "result" && result ? (
        <ResultSection result={result} onClose={handleReset} />
      ) : null}
    </div>
  );
}

function PreviewSection({
  preview,
  onConfirm,
  pending,
}: {
  preview: ImportPreview;
  onConfirm: () => void;
  pending: boolean;
}) {
  return (
    <section className="border-ink-300 bg-paper flex flex-col gap-4 rounded-md border p-5">
      <header className="flex flex-col gap-1">
        <h3 className="font-display text-pool-deep text-lg font-bold">Previsualización</h3>
        <p className="text-ink-600 text-sm">
          {preview.totalRows === 0
            ? "No hemos encontrado filas válidas en el archivo."
            : `${preview.totalRows} jugadores listos para importar.`}
        </p>
      </header>

      {preview.errors.length > 0 ? (
        <Alert variant="warning" title={`${preview.errors.length} avisos`}>
          <ul className="list-disc pl-4">
            {preview.errors.slice(0, 5).map((e, i) => (
              <li key={i}>
                Fila {e.rowNumber}
                {e.full_name ? ` (${e.full_name})` : ""}: {e.message}
              </li>
            ))}
            {preview.errors.length > 5 ? <li>…y {preview.errors.length - 5} más.</li> : null}
          </ul>
        </Alert>
      ) : null}

      {preview.preview.length > 0 ? (
        <div className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
          <table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-ink-600 text-xs tracking-wider uppercase">
                <th className="border-ink-300 hidden w-16 border-b px-3 py-2 font-semibold sm:table-cell">
                  Fila
                </th>
                <th className="border-ink-300 border-b px-3 py-2 font-semibold">Nombre</th>
                <th className="border-ink-300 hidden w-20 border-b px-3 py-2 font-semibold sm:table-cell">
                  Año
                </th>
                <th className="border-ink-300 hidden w-20 border-b px-3 py-2 font-semibold sm:table-cell">
                  Dorsal
                </th>
                <th className="border-ink-300 border-b px-3 py-2 font-semibold">Equipo</th>
                <th className="border-ink-300 hidden border-b px-3 py-2 font-semibold sm:table-cell">
                  Tutor
                </th>
              </tr>
            </thead>
            <tbody>
              {preview.preview.map((r) => (
                <PreviewRowTr key={r.rowNumber} row={r} />
              ))}
              {preview.totalRows > preview.preview.length ? (
                <tr>
                  <td colSpan={6} className="text-ink-600 px-3 py-2 text-center text-xs italic">
                    …y {preview.totalRows - preview.preview.length} más.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button size="lg" onClick={onConfirm} disabled={pending || preview.totalRows === 0}>
          {pending ? <MdAutorenew className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
          Confirmar importación
        </Button>
      </div>
    </section>
  );
}

function PreviewRowTr({ row }: { row: PreviewRow }) {
  return (
    <tr>
      <td className="border-ink-300 text-ink-600 hidden border-b px-3 py-2 font-mono text-xs sm:table-cell">
        {row.rowNumber}
      </td>
      <td className="border-ink-300 text-pool-deep truncate border-b px-3 py-2 font-semibold">
        {row.full_name}
      </td>
      <td className="border-ink-300 text-ink-600 hidden border-b px-3 py-2 font-mono text-xs sm:table-cell">
        {row.birth_year}
      </td>
      <td className="border-ink-300 text-ink-600 hidden border-b px-3 py-2 font-mono text-xs sm:table-cell">
        {row.squad_number ?? "—"}
      </td>
      <td className="border-ink-300 text-ink-600 truncate border-b px-3 py-2">
        {row.team_label ?? "—"}
      </td>
      <td className="border-ink-300 text-ink-600 hidden truncate border-b px-3 py-2 sm:table-cell">
        {row.parent_email ?? "—"}
      </td>
    </tr>
  );
}

function ResultSection({ result, onClose }: { result: ImportResult; onClose: () => void }) {
  return (
    <section className="border-ink-300 bg-paper flex flex-col gap-4 rounded-md border p-5">
      <header className="flex flex-col gap-2">
        <h3 className="font-display text-pool-deep flex items-center gap-2 text-lg font-bold">
          <MdCheckCircle className="text-success h-5 w-5" aria-hidden="true" />
          Importación completada
        </h3>
        <p className="text-ink-600 text-sm">
          {result.created} jugadores creados, {result.skipped} omitidos (ya existían).
        </p>
      </header>

      {result.errors.length > 0 ? (
        <Alert variant="warning" title={`${result.errors.length} errores`}>
          <ul className="list-disc pl-4">
            {result.errors.slice(0, 10).map((e, i) => (
              <li key={i}>
                Fila {e.rowNumber}
                {e.full_name ? ` (${e.full_name})` : ""}: {e.message}
              </li>
            ))}
            {result.errors.length > 10 ? <li>…y {result.errors.length - 10} más.</li> : null}
          </ul>
        </Alert>
      ) : null}

      {result.created === 0 && result.skipped === 0 && result.errors.length === 0 ? (
        <Alert variant="info">No se importó ninguna fila.</Alert>
      ) : null}

      <div className="flex justify-end">
        <Button size="md" variant="secondary" onClick={onClose}>
          <MdCancel className="h-5 w-5" aria-hidden="true" />
          Empezar de nuevo
        </Button>
      </div>
    </section>
  );
}
