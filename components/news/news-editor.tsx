"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  CalendarClock,
  Eye,
  FileText,
  ImagePlus,
  Megaphone,
  Pencil,
  Pin,
  Save,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Markdown } from "@/components/ui/markdown";
import { Select } from "@/components/ui/select";
import { isValidAudience, NEWS_LIMITS } from "@/lib/domain/news";
import { cn } from "@/lib/utils/cn";

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

function EditorPanel({
  icon,
  title,
  description,
  children,
  className,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "border-ink-200 bg-paper-card shadow-elev-1 overflow-hidden rounded-2xl border",
        className,
      )}
    >
      <div className="border-ink-200 bg-pool-foam/70 flex items-center gap-3 border-b px-4 py-3">
        <span className="bg-pool-deep text-paper flex h-9 w-9 shrink-0 items-center justify-center rounded-xl [&>svg]:h-4.5 [&>svg]:w-4.5">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-pool-deep text-base leading-tight font-extrabold">
            {title}
          </h2>
          <p className="text-ink-700 mt-0.5 text-sm leading-5 text-pretty">{description}</p>
        </div>
      </div>
      <div className="flex flex-col gap-4 p-4">{children}</div>
    </section>
  );
}

function SwitchRow({
  id,
  checked,
  disabled,
  onChange,
  icon,
  title,
  description,
}: {
  id: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "border-ink-200 bg-paper hover:border-pool-blue/50 flex min-h-14 cursor-pointer touch-manipulation items-center gap-3 rounded-xl border px-3 py-2.5 transition-[border-color,background-color] motion-reduce:transition-none",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        id={id}
        type="checkbox"
        aria-label={title}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span className="bg-pool-foam text-pool-deep flex h-9 w-9 shrink-0 items-center justify-center rounded-lg [&>svg]:h-4.5 [&>svg]:w-4.5">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-pool-deep block text-sm leading-tight font-extrabold">{title}</span>
        <span className="text-ink-600 mt-0.5 block text-xs leading-5 text-pretty">
          {description}
        </span>
      </span>
      <span className="bg-ink-300 peer-checked:bg-pool-blue peer-focus-visible:ring-pool-blue peer-focus-visible:ring-offset-paper relative h-7 w-12 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 after:absolute after:top-1 after:left-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5 motion-reduce:transition-none motion-reduce:after:transition-none" />
    </label>
  );
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
  const [imageUrl] = useState(initial.image_url ?? null);
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
  const [showExpiry, setShowExpiry] = useState(Boolean(initial.expires_at));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const trimmedTitle = title.trim();
    const trimmedBody = bodyMd.trim();
    if (trimmedTitle.length < 3) return setError("Escribe un título de al menos 3 caracteres.");
    if (trimmedTitle.length > NEWS_LIMITS.MAX_TITLE)
      return setError(`El título admite hasta ${NEWS_LIMITS.MAX_TITLE} caracteres.`);
    if (trimmedBody.length < 1) return setError("Escribe el mensaje de la noticia.");
    if (trimmedBody.length > NEWS_LIMITS.MAX_BODY)
      return setError(`El mensaje admite hasta ${NEWS_LIMITS.MAX_BODY} caracteres.`);
    let expiresIso: string | null = null;
    if (showExpiry && expiresAt) {
      const date = new Date(expiresAt);
      if (Number.isNaN(date.getTime())) return setError("Revisa la fecha de caducidad.");
      if (mode === "create" && date.getTime() < Date.now() - 1000 * 60) {
        return setError("Elige una fecha de caducidad futura.");
      }
      expiresIso = date.toISOString();
    }
    if (showExpiry && !expiresAt) return setError("Indica cuándo debe caducar la noticia.");
    if (audience === "team" && !audienceTeamId) {
      return setError("Selecciona el equipo que recibirá la noticia.");
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
      } catch (submitError) {
        setError(
          submitError instanceof Error ? submitError.message : "No pudimos guardar la noticia.",
        );
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
        } catch (pinError) {
          setPinned(!next);
          setError(
            pinError instanceof Error ? pinError.message : "No pudimos cambiar el destacado.",
          );
        }
      });
    }
  }

  function deletePost() {
    if (!onDelete) return;
    startTransition(async () => {
      try {
        await onDelete();
      } catch (deleteError) {
        setConfirmDelete(false);
        setError(
          deleteError instanceof Error ? deleteError.message : "No pudimos eliminar la noticia.",
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} data-news-editor className="flex flex-col gap-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.8fr)] lg:items-start">
        <EditorPanel
          icon={<FileText aria-hidden="true" />}
          title="Contenido de la noticia"
          description="Escribe un título claro y el mensaje que verá el club."
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-end justify-between gap-3">
              <label htmlFor="news-title" className="text-pool-deep text-sm font-extrabold">
                Título
              </label>
              <span className="text-ink-500 text-xs font-semibold tabular-nums">
                {title.length}/{NEWS_LIMITS.MAX_TITLE}
              </span>
            </div>
            <Input
              id="news-title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej.: Cambio de horario del viernes…"
              maxLength={NEWS_LIMITS.MAX_TITLE}
              autoComplete="off"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <label htmlFor="news-body" className="text-pool-deep text-sm font-extrabold">
                  Mensaje
                </label>
                <p className="text-ink-600 mt-0.5 text-xs leading-5">
                  Puedes usar listas, títulos y enlaces.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreview((value) => !value)}
                className="border-ink-300 bg-paper text-pool-deep hover:border-pool-blue hover:bg-pool-foam focus-visible:ring-pool-blue inline-flex min-h-11 shrink-0 touch-manipulation items-center gap-1.5 rounded-lg border px-3 text-sm font-extrabold transition-[border-color,background-color] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none"
              >
                {preview ? (
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
                {preview ? "Seguir editando" : "Ver resultado"}
              </button>
            </div>
            {preview ? (
              <div
                role="region"
                aria-label="Vista previa del mensaje"
                className="border-ink-300 bg-paper min-h-48 overflow-hidden rounded-xl border p-4 break-words"
              >
                <Markdown>{bodyMd || "_(Todavía no has escrito el mensaje.)_"}</Markdown>
              </div>
            ) : (
              <textarea
                id="news-body"
                name="body_md"
                value={bodyMd}
                onChange={(event) => setBodyMd(event.target.value)}
                placeholder="Escribe aquí el aviso para el club…"
                maxLength={NEWS_LIMITS.MAX_BODY}
                autoComplete="off"
                className="border-ink-300 bg-paper text-pool-deep placeholder:text-ink-600/70 focus-visible:border-pool-blue focus-visible:ring-pool-blue focus-visible:ring-offset-paper min-h-48 w-full resize-y rounded-xl border p-3.5 text-base leading-6 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                required
              />
            )}
            <span className="text-ink-500 self-end text-xs font-semibold tabular-nums">
              {bodyMd.length}/{NEWS_LIMITS.MAX_BODY}
            </span>
          </div>
        </EditorPanel>

        <div className="flex flex-col gap-3 lg:sticky lg:top-[calc(var(--top-bar-height)+1rem)]">
          <EditorPanel
            icon={<Megaphone aria-hidden="true" />}
            title="Publicación"
            description="Elige quién la verá y durante cuánto tiempo."
          >
            <fieldset className="flex flex-col gap-2">
              <legend className="text-pool-deep mb-1 text-sm font-extrabold">Destinatarios</legend>
              <div className="grid grid-cols-2 gap-2" aria-label="Destinatarios de la noticia">
                <button
                  type="button"
                  aria-pressed={audience === "club"}
                  onClick={() => {
                    setAudience("club");
                    setAudienceTeamId(null);
                  }}
                  className={cn(
                    "focus-visible:ring-pool-blue flex min-h-14 touch-manipulation items-center justify-center gap-2 rounded-xl border px-3 text-sm font-extrabold transition-[border-color,background-color,color] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none",
                    audience === "club"
                      ? "border-pool-blue bg-pool-blue text-paper shadow-sm"
                      : "border-ink-300 bg-paper text-pool-deep hover:border-pool-blue/60 hover:bg-pool-foam",
                  )}
                >
                  <Users className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                  Todo el club
                </button>
                <button
                  type="button"
                  aria-pressed={audience === "team"}
                  onClick={() => setAudience("team")}
                  className={cn(
                    "focus-visible:ring-pool-blue flex min-h-14 touch-manipulation items-center justify-center gap-2 rounded-xl border px-3 text-sm font-extrabold transition-[border-color,background-color,color] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none",
                    audience === "team"
                      ? "border-pool-blue bg-pool-blue text-paper shadow-sm"
                      : "border-ink-300 bg-paper text-pool-deep hover:border-pool-blue/60 hover:bg-pool-foam",
                  )}
                >
                  <UserRound className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                  Un equipo
                </button>
              </div>
            </fieldset>

            {audience === "team" ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="news-team" className="text-pool-deep text-sm font-extrabold">
                  Equipo destinatario
                </label>
                <Select
                  id="news-team"
                  name="audience_team_id"
                  value={audienceTeamId ?? ""}
                  onChange={(event) => setAudienceTeamId(event.target.value || null)}
                  autoComplete="off"
                  required
                >
                  <option value="">Selecciona un equipo</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.label}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

            <SwitchRow
              id="news-has-expiry"
              checked={showExpiry}
              disabled={pending}
              onChange={(checked) => {
                setShowExpiry(checked);
                if (!checked) setExpiresAt("");
              }}
              icon={<CalendarClock aria-hidden="true" />}
              title="Añadir fecha de caducidad"
              description="La noticia dejará de mostrarse automáticamente."
            />

            {showExpiry ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="news-expires" className="text-pool-deep text-sm font-extrabold">
                  Fecha y hora de caducidad
                </label>
                <input
                  id="news-expires"
                  name="expires_at"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(event) => setExpiresAt(event.target.value)}
                  autoComplete="off"
                  className="border-ink-300 bg-paper text-pool-deep focus-visible:border-pool-blue focus-visible:ring-pool-blue focus-visible:ring-offset-paper h-12 min-h-12 w-full rounded-xl border px-3 text-base focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  required
                />
              </div>
            ) : null}

            <SwitchRow
              id="news-pinned"
              checked={pinned}
              disabled={pending}
              onChange={togglePin}
              icon={<Pin aria-hidden="true" />}
              title="Destacar en Noticias"
              description="Aparecerá antes que el resto de avisos."
            />
          </EditorPanel>

          <EditorPanel
            icon={<ImagePlus aria-hidden="true" />}
            title="Imagen de portada"
            description="Opcional. Ayuda a reconocer el aviso rápidamente."
          >
            <input
              id="news-image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
              className="peer sr-only"
            />
            <label
              htmlFor="news-image"
              className="border-ink-300 bg-paper hover:border-pool-blue hover:bg-pool-foam peer-focus-visible:ring-pool-blue flex min-h-14 cursor-pointer touch-manipulation items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 transition-[border-color,background-color] peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              <span className="bg-pool-foam text-pool-deep flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                <ImagePlus className="h-4.5 w-4.5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="text-pool-deep block truncate text-sm font-extrabold">
                  {imageFile?.name ?? (imageUrl ? "Cambiar la imagen actual" : "Elegir una imagen")}
                </span>
                <span className="text-ink-600 mt-0.5 block text-xs leading-5">
                  JPG, PNG o WebP · máximo 5 MB
                </span>
              </span>
            </label>
            {imageUrl ? (
              <a
                href={imageUrl}
                className="text-pool-blue focus-visible:ring-pool-blue w-fit rounded text-sm font-bold hover:underline focus-visible:ring-2 focus-visible:outline-none"
                target="_blank"
                rel="noreferrer"
              >
                Ver imagen actual
              </a>
            ) : null}
          </EditorPanel>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          aria-live="polite"
          className="border-goggle-red/30 bg-goggle-red/8 text-goggle-red rounded-xl border px-4 py-3 text-sm font-bold"
        >
          {error}
        </div>
      ) : null}

      {confirmDelete ? (
        <div
          role="alert"
          className="border-goggle-red/30 bg-goggle-red/8 rounded-xl border p-3 sm:flex sm:items-center sm:justify-between sm:gap-4"
        >
          <div>
            <p className="text-goggle-red text-sm font-extrabold">¿Eliminar esta noticia?</p>
            <p className="text-ink-700 mt-0.5 text-sm">Desaparecerá para todo el club.</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-0 sm:flex">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setConfirmDelete(false)}
              disabled={pending}
            >
              <X className="h-4 w-4" aria-hidden="true" /> Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={deletePost}
              disabled={pending}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {pending ? "Eliminando…" : "Sí, eliminar"}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="border-ink-200 bg-paper-card shadow-elev-1 flex items-center justify-between gap-2 rounded-2xl border p-2.5 sm:justify-end sm:bg-transparent sm:p-0 sm:shadow-none">
        {mode === "edit" && onDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={() => setConfirmDelete(true)}
            disabled={pending || confirmDelete}
            className="text-goggle-red hover:bg-goggle-red/10"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Eliminar
          </Button>
        ) : (
          <span className="text-ink-600 hidden pl-1 text-xs font-semibold min-[380px]:block">
            Podrás editarla después
          </span>
        )}
        <Button type="submit" variant="primary" size="md" disabled={pending || confirmDelete}>
          <Save className="h-4 w-4" aria-hidden="true" />
          {pending
            ? mode === "create"
              ? "Publicando…"
              : "Guardando…"
            : mode === "create"
              ? "Publicar noticia"
              : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
