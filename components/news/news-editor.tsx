"use client";

import { useState, useTransition } from "react";
import { Save, Pin, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Markdown } from "@/components/ui/markdown";
import { PictogramBadge } from "@/components/ui/pictogram-badge";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { isValidAudience, isValidReaction, NEWS_LIMITS } from "@/lib/domain/news";

export interface TeamOption {
  id: string;
  label: string;
}

export interface NewsEditorInitial {
  title?: string;
  body_md?: string;
  image_url?: string | null;
  audience?: "club" | "team";
  audience_team_id?: string | null;
  pinned?: boolean;
  expires_at?: string | null;
}

export interface NewsEditorProps {
  initial?: NewsEditorInitial;
  teams: TeamOption[];
  mode: "create" | "edit";
  onSubmit: (data: {
    title: string;
    body_md: string;
    image_url: string | null;
    audience: "club" | "team";
    audience_team_id: string | null;
    pinned: boolean;
    expires_at: string | null;
    imageFile: File | null;
  }) => Promise<void>;
  onPinToggle?: (pinned: boolean) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export function NewsEditor({
  initial = {},
  teams,
  mode,
  onSubmit,
  onPinToggle,
  onDelete,
}: NewsEditorProps) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [bodyMd, setBodyMd] = useState(initial.body_md ?? "");
  const [imageUrl, setImageUrl] = useState(initial.image_url ?? null);
  void setImageUrl;
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audience, setAudience] = useState<"club" | "team">(
    isValidAudience(initial.audience) ? initial.audience : "club",
  );
  const [audienceTeamId, setAudienceTeamId] = useState<string | null>(
    initial.audience_team_id ?? null,
  );
  const [pinned, setPinned] = useState(initial.pinned ?? false);
  const [expiresAt, setExpiresAt] = useState<string>(
    initial.expires_at ? new Date(initial.expires_at).toISOString().slice(0, 16) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedTitle = title.trim();
    const trimmedBody = bodyMd.trim();
    if (trimmedTitle.length < 3) return setError("El título es demasiado corto.");
    if (trimmedTitle.length > NEWS_LIMITS.MAX_TITLE)
      return setError(`Máximo ${NEWS_LIMITS.MAX_TITLE} caracteres en el título.`);
    if (trimmedBody.length < 1) return setError("El cuerpo no puede estar vacío.");
    if (trimmedBody.length > NEWS_LIMITS.MAX_BODY)
      return setError(`Máximo ${NEWS_LIMITS.MAX_BODY} caracteres en el cuerpo.`);
    let expiresIso: string | null = null;
    if (expiresAt) {
      const d = new Date(expiresAt);
      if (Number.isNaN(d.getTime())) return setError("Fecha de caducidad inválida.");
      if (d.getTime() < Date.now() - 1000 * 60) {
        return setError("La caducidad debe ser en el futuro.");
      }
      expiresIso = d.toISOString();
    }
    if (audience === "team" && !audienceTeamId) {
      return setError("Selecciona el equipo destinatario.");
    }
    startTransition(async () => {
      try {
        await onSubmit({
          title: trimmedTitle,
          body_md: trimmedBody,
          image_url: imageUrl,
          audience,
          audience_team_id: audience === "team" ? audienceTeamId : null,
          pinned,
          expires_at: expiresIso,
          imageFile,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ha habido un problema.");
      }
    });
  }

  function togglePin() {
    const next = !pinned;
    setPinned(next);
    if (onPinToggle) {
      startTransition(async () => {
        try {
          await onPinToggle(next);
        } catch (err) {
          setPinned(!next);
          setError(err instanceof Error ? err.message : "Ha habido un problema.");
        }
      });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      data-news-editor
      className="flex flex-col gap-3 rounded-md border border-ink-300 bg-paper-card p-4 shadow-elev-1"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="news-title" className="text-eyebrow text-ink-600">
          Título
        </label>
        <Input
          id="news-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="¿Qué pasa en el club?"
          maxLength={NEWS_LIMITS.MAX_TITLE}
          required
        />
        <span className="text-[10px] text-ink-500">
          {title.length}/{NEWS_LIMITS.MAX_TITLE}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="news-audience" className="text-eyebrow text-ink-600">
            Audiencia
          </label>
          <Select
            id="news-audience"
            value={audience}
            onChange={(e) => {
              const v = e.target.value;
              if (isValidAudience(v)) {
                setAudience(v);
                if (v === "club") setAudienceTeamId(null);
              }
            }}
          >
            <option value="club">Todo el club</option>
            <option value="team">Un equipo</option>
          </Select>
        </div>
        {audience === "team" ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="news-team" className="text-eyebrow text-ink-600">
              Equipo
            </label>
            <Select
              id="news-team"
              value={audienceTeamId ?? ""}
              onChange={(e) => setAudienceTeamId(e.target.value || null)}
              required
            >
              <option value="">Selecciona un equipo</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label htmlFor="news-expires" className="text-eyebrow text-ink-600">
              Caduca (opcional)
            </label>
            <input
              id="news-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="h-12 min-h-12 w-full rounded border border-ink-300 bg-paper px-3 text-sm text-pool-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue"
            />
          </div>
        )}
      </div>

      {audience === "team" ? (
        <div className="flex flex-col gap-1">
          <label htmlFor="news-expires" className="text-eyebrow text-ink-600">
            Caduca (opcional)
          </label>
          <input
            id="news-expires"
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="h-12 min-h-12 w-full rounded border border-ink-300 bg-paper px-3 text-sm text-pool-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue"
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label htmlFor="news-body" className="text-eyebrow text-ink-600">
            Cuerpo (Markdown)
          </label>
          <button
            type="button"
            onClick={() => setPreview((v) => !v)}
            className="text-[10px] font-bold uppercase tracking-wider text-pool-blue hover:underline"
          >
            {preview ? "Editar" : "Vista previa"}
          </button>
        </div>
        {preview ? (
          <div className="min-h-[160px] rounded border border-ink-300 bg-paper p-3">
            <Markdown>{bodyMd || "_(vacío)_"}</Markdown>
          </div>
        ) : (
          <textarea
            id="news-body"
            value={bodyMd}
            onChange={(e) => setBodyMd(e.target.value)}
            placeholder="**Negrita**, _cursiva_, [enlaces](https://...), listas, etc."
            maxLength={NEWS_LIMITS.MAX_BODY}
            className="min-h-[160px] w-full resize-y rounded border border-ink-300 bg-paper p-3 font-mono text-sm text-pool-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue"
            required
          />
        )}
        <span className="text-[10px] text-ink-500">
          {bodyMd.length}/{NEWS_LIMITS.MAX_BODY}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="news-image" className="text-eyebrow text-ink-600">
          Imagen (opcional, JPG/PNG/WebP, máx 5 MB)
        </label>
        <input
          id="news-image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setImageFile(f);
          }}
          className="h-12 min-h-12 w-full rounded border border-ink-300 bg-paper px-3 text-sm text-pool-deep file:mr-3 file:rounded file:border-0 file:bg-pool-deep file:px-3 file:py-1 file:text-xs file:font-bold file:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue"
        />
        {imageUrl ? (
          <p className="text-[10px] text-ink-500">
            Imagen actual: <a href={imageUrl} className="text-pool-blue hover:underline" target="_blank" rel="noreferrer">ver</a>
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 text-sm text-pool-deep">
          <input
            type="checkbox"
            checked={pinned}
            onChange={togglePin}
            disabled={pending || !onPinToggle}
            className="h-4 w-4 rounded border-ink-300 text-pool-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pool-blue"
          />
          <Pin className="h-3.5 w-3.5" aria-hidden="true" />
          Fijar arriba del feed
        </label>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded border border-goggle-red/30 bg-goggle-red/5 px-3 py-2 text-xs font-bold text-goggle-red"
        >
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 border-t border-ink-300 pt-3">
        {mode === "edit" && onDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => {
              if (confirm("¿Eliminar esta noticia? No se puede deshacer.")) {
                startTransition(async () => {
                  try {
                    await onDelete();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Ha habido un problema.");
                  }
                });
              }
            }}
            disabled={pending}
            className="text-goggle-red"
          >
            <X className="h-4 w-4" /> Eliminar
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" variant="primary" size="md" disabled={pending}>
          <Save className="h-4 w-4" />
          {pending ? "Guardando…" : mode === "create" ? "Publicar" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

void PictogramBadge;
void isValidReaction;
void cn;
