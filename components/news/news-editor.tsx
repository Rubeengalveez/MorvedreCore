"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import {
  CalendarClock,
  Eye,
  ImagePlus,
  Pencil,
  Pin,
  Save,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmActionSheet } from "@/components/ui/confirm-action-sheet";
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
  onDelete?: () => Promise<void>;
}

function toLocalDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function EditorSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-paper-card shadow-elev-1 border-ink-200 overflow-hidden rounded-2xl border">
      <div className="border-ink-200 flex items-start gap-3 border-b px-4 py-3.5">
        <span
          className="text-pool-blue font-mono text-lg leading-none font-extrabold"
          aria-hidden="true"
        >
          {number}
        </span>
        <div>
          <h2 className="font-display text-pool-deep text-base leading-tight font-extrabold">
            {title}
          </h2>
          <p className="text-ink-600 mt-0.5 text-xs leading-5">{description}</p>
        </div>
      </div>
      <div className="flex flex-col gap-4 p-4">{children}</div>
    </section>
  );
}

function OptionToggle({
  id,
  checked,
  disabled,
  onChange,
  icon,
  label,
  description,
}: {
  id: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
  icon: ReactNode;
  label: string;
  description: string;
}) {
  return (
    <label
      htmlFor={id}
      className="border-ink-200 bg-paper hover:border-pool-blue/50 flex min-h-14 cursor-pointer touch-manipulation items-center gap-3 rounded-xl border px-3 py-2.5"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={label}
        className="peer sr-only"
      />
      <span className="bg-pool-foam text-pool-deep flex h-9 w-9 shrink-0 items-center justify-center rounded-lg [&>svg]:h-4.5 [&>svg]:w-4.5">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-pool-deep block text-sm leading-tight font-extrabold">{label}</span>
        <span className="text-ink-600 mt-0.5 block text-xs leading-4">{description}</span>
      </span>
      <span className="bg-ink-300 peer-checked:bg-pool-blue peer-focus-visible:ring-pool-blue peer-focus-visible:ring-offset-paper relative h-7 w-12 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 after:absolute after:top-1 after:left-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5 motion-reduce:transition-none motion-reduce:after:transition-none" />
    </label>
  );
}

export function NewsEditor({ initial = {}, teams, mode, onSubmit, onDelete }: NewsEditorProps) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [bodyMd, setBodyMd] = useState(initial.body_md ?? "");
  const [imageUrl, setImageUrl] = useState(initial.image_url ?? null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
  const localImageUrlRef = useRef<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [audience, setAudience] = useState<"club" | "team">(
    isValidAudience(initial.audience) ? initial.audience : "club",
  );
  const [audienceTeamId, setAudienceTeamId] = useState<string | null>(
    initial.audience_team_id ?? null,
  );
  const [pinned, setPinned] = useState(initial.pinned ?? false);
  const [expiresAt, setExpiresAt] = useState(
    initial.expires_at ? toLocalDateTime(initial.expires_at) : "",
  );
  const [showExpiry, setShowExpiry] = useState(Boolean(initial.expires_at));
  const [preview, setPreview] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (localImageUrlRef.current) URL.revokeObjectURL(localImageUrlRef.current);
    };
  }, []);

  const coverUrl = localImageUrl ?? imageUrl;
  const audienceLabel =
    audience === "club"
      ? "Todo el club"
      : (teams.find((team) => team.id === audienceTeamId)?.label ?? "Un equipo");

  function chooseImage(file: File | null) {
    if (!file) return;
    if (
      file.size === 0 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Usa una imagen JPG, PNG o WebP de hasta 5 MB.");
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }
    setError(null);
    if (localImageUrlRef.current) URL.revokeObjectURL(localImageUrlRef.current);
    const url = URL.createObjectURL(file);
    localImageUrlRef.current = url;
    setLocalImageUrl(url);
    setImageFile(file);
  }

  function removeImage() {
    if (localImageUrlRef.current) URL.revokeObjectURL(localImageUrlRef.current);
    localImageUrlRef.current = null;
    setImageFile(null);
    setImageUrl(null);
    setLocalImageUrl(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const trimmedTitle = title.trim();
    const trimmedBody = bodyMd.trim();
    if (trimmedTitle.length < 3) return setError("Escribe un título de al menos 3 caracteres.");
    if (trimmedTitle.length > NEWS_LIMITS.MAX_TITLE)
      return setError(`El título admite hasta ${NEWS_LIMITS.MAX_TITLE} caracteres.`);
    if (!trimmedBody) return setError("Escribe el mensaje de la noticia.");
    if (trimmedBody.length > NEWS_LIMITS.MAX_BODY)
      return setError(`El mensaje admite hasta ${NEWS_LIMITS.MAX_BODY} caracteres.`);
    if (audience === "team" && !audienceTeamId)
      return setError("Selecciona el equipo que recibirá la noticia.");

    let expiresIso: string | null = null;
    if (showExpiry) {
      if (!expiresAt) return setError("Indica cuándo debe caducar la noticia.");
      const date = new Date(expiresAt);
      if (Number.isNaN(date.getTime())) return setError("Revisa la fecha de caducidad.");
      if (mode === "create" && date.getTime() < Date.now() - 60_000)
        return setError("Elige una fecha de caducidad futura.");
      expiresIso = date.toISOString();
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
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No pudimos guardar la noticia.");
      }
    });
  }

  function deletePost() {
    if (!onDelete) return;
    setError(null);
    startTransition(async () => {
      try {
        await onDelete();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No pudimos eliminar la noticia.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} data-news-editor className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.8fr)] lg:items-start">
        <EditorSection
          number="01"
          title="La noticia"
          description="Pon la información importante al principio."
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="news-title" className="text-pool-deep text-sm font-extrabold">
                Titular
              </label>
              <span className="text-ink-600 text-xs font-semibold tabular-nums">
                {title.length}/{NEWS_LIMITS.MAX_TITLE}
              </span>
            </div>
            <Input
              id="news-title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="¿Qué necesita saber el club?"
              maxLength={NEWS_LIMITS.MAX_TITLE}
              autoComplete="off"
              className="font-display h-auto min-h-14 rounded-xl text-lg font-extrabold sm:text-xl"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="news-body" className="text-pool-deep text-sm font-extrabold">
                Mensaje
              </label>
              <button
                type="button"
                onClick={() => setPreview((value) => !value)}
                aria-pressed={preview}
                className="border-pool-blue/25 bg-pool-foam text-pool-deep hover:bg-pool-foam/70 focus-visible:ring-pool-blue inline-flex min-h-12 touch-manipulation items-center gap-2 rounded-xl border px-3 text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none"
              >
                {preview ? (
                  <Pencil aria-hidden="true" className="h-4 w-4" />
                ) : (
                  <Eye aria-hidden="true" className="h-4 w-4" />
                )}
                {preview ? "Seguir editando" : "Ver resultado"}
              </button>
            </div>
            {preview ? (
              <div
                role="region"
                aria-label="Vista previa de la noticia"
                className="border-ink-200 bg-paper overflow-hidden rounded-xl border"
              >
                {coverUrl ? (
                  <div
                    role="img"
                    aria-label="Imagen de portada"
                    className="aspect-[16/8] bg-cover bg-center"
                    style={{ backgroundImage: `url("${coverUrl}")` }}
                  />
                ) : null}
                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold uppercase">
                    <span className="text-pool-blue">{audienceLabel}</span>
                    {pinned ? (
                      <span className="bg-ball-gold/25 text-pool-deep rounded-full px-2 py-1">
                        Destacada
                      </span>
                    ) : null}
                  </div>
                  <h3 className="font-display text-pool-deep mt-2 text-xl leading-tight font-extrabold break-words">
                    {title.trim() || "Aquí aparecerá el titular"}
                  </h3>
                  <div className="mt-4">
                    <Markdown>{bodyMd || "_Escribe el mensaje para ver cómo quedará._"}</Markdown>
                  </div>
                </div>
              </div>
            ) : (
              <textarea
                id="news-body"
                name="body_md"
                value={bodyMd}
                onChange={(event) => setBodyMd(event.target.value)}
                placeholder="Cuenta qué ha pasado, cuándo y qué tiene que hacer quien lo lea…"
                maxLength={NEWS_LIMITS.MAX_BODY}
                autoComplete="off"
                className="border-ink-300 bg-paper text-pool-deep placeholder:text-ink-600/70 focus-visible:border-pool-blue focus-visible:ring-pool-blue min-h-72 w-full resize-y rounded-xl border p-4 text-base leading-7 focus-visible:ring-2 focus-visible:outline-none"
                required
              />
            )}
            <div className="text-ink-600 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span>Puedes usar listas, títulos y enlaces.</span>
              <span className="font-semibold tabular-nums">
                {bodyMd.length}/{NEWS_LIMITS.MAX_BODY}
              </span>
            </div>
          </div>
        </EditorSection>

        <div className="flex flex-col gap-4 lg:sticky lg:top-[calc(var(--top-bar-height)+1rem)]">
          <EditorSection
            number="02"
            title="Destinatarios"
            description="Decide quién verá esta noticia."
          >
            <fieldset>
              <legend className="text-pool-deep mb-2 text-sm font-extrabold">Publicar para</legend>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={audience === "club"}
                  onClick={() => {
                    setAudience("club");
                    setAudienceTeamId(null);
                  }}
                  className={cn(
                    "focus-visible:ring-pool-blue flex min-h-14 touch-manipulation items-center justify-center gap-1.5 rounded-xl border px-2 text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none",
                    audience === "club"
                      ? "border-pool-deep bg-pool-deep text-paper"
                      : "border-ink-300 bg-paper text-pool-deep hover:bg-pool-foam",
                  )}
                >
                  <Users aria-hidden="true" className="h-4 w-4 shrink-0" /> Todo el club
                </button>
                <button
                  type="button"
                  aria-pressed={audience === "team"}
                  onClick={() => setAudience("team")}
                  className={cn(
                    "focus-visible:ring-pool-blue flex min-h-14 touch-manipulation items-center justify-center rounded-xl border px-2 text-sm font-extrabold focus-visible:ring-2 focus-visible:outline-none",
                    audience === "team"
                      ? "border-pool-deep bg-pool-deep text-paper"
                      : "border-ink-300 bg-paper text-pool-deep hover:bg-pool-foam",
                  )}
                >
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
          </EditorSection>

          <EditorSection
            number="03"
            title="Presentación"
            description="Añade una portada y ajusta su visibilidad."
          >
            <div className="flex flex-col gap-2">
              <label htmlFor="news-image" className="text-pool-deep text-sm font-extrabold">
                Imagen de portada <span className="text-ink-600 font-medium">· opcional</span>
              </label>
              {coverUrl ? (
                <div
                  role="img"
                  aria-label="Portada seleccionada"
                  className="bg-pool-foam aspect-[16/8] overflow-hidden rounded-xl bg-cover bg-center"
                  style={{ backgroundImage: `url("${coverUrl}")` }}
                />
              ) : null}
              <input
                ref={imageInputRef}
                id="news-image"
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => chooseImage(event.target.files?.[0] ?? null)}
                className="peer sr-only"
              />
              <label
                htmlFor="news-image"
                className="border-ink-300 bg-paper hover:border-pool-blue hover:bg-pool-foam peer-focus-visible:ring-pool-blue text-pool-deep flex min-h-12 cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-xl border border-dashed px-3 text-sm font-extrabold peer-focus-visible:ring-2 peer-focus-visible:outline-none"
              >
                <ImagePlus aria-hidden="true" className="h-4 w-4" />
                {coverUrl ? "Cambiar portada" : "Añadir portada"}
              </label>
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-600 text-xs">JPG, PNG o WebP · hasta 5 MB</span>
                {coverUrl ? (
                  <button
                    type="button"
                    onClick={removeImage}
                    className="text-goggle-red focus-visible:ring-goggle-red inline-flex min-h-12 items-center gap-1 rounded px-1 text-xs font-extrabold focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <X aria-hidden="true" className="h-4 w-4" /> Quitar
                  </button>
                ) : null}
              </div>
            </div>

            <div className="border-ink-200 flex flex-col gap-2 border-t pt-4">
              <OptionToggle
                id="news-pinned"
                checked={pinned}
                disabled={pending}
                onChange={setPinned}
                icon={<Pin aria-hidden="true" />}
                label="Destacar en Noticias"
                description="Se mostrará antes que el resto."
              />
              <OptionToggle
                id="news-has-expiry"
                checked={showExpiry}
                disabled={pending}
                onChange={(checked) => {
                  setShowExpiry(checked);
                  if (!checked) setExpiresAt("");
                }}
                icon={<CalendarClock aria-hidden="true" />}
                label="Añadir fecha de caducidad"
                description="Desaparece al caducar y se elimina después automáticamente."
              />
              {showExpiry ? (
                <div className="flex flex-col gap-1.5 pt-1">
                  <label htmlFor="news-expires" className="text-pool-deep text-sm font-extrabold">
                    Fecha y hora de caducidad
                  </label>
                  <input
                    id="news-expires"
                    name="expires_at"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(event) => setExpiresAt(event.target.value)}
                    className="border-ink-300 bg-paper text-pool-deep focus-visible:ring-pool-blue h-12 w-full rounded-xl border px-3 text-base focus-visible:ring-2 focus-visible:outline-none"
                    required
                  />
                </div>
              ) : null}
            </div>
          </EditorSection>
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          aria-live="polite"
          className="border-goggle-red/30 bg-goggle-red/8 text-goggle-red rounded-xl border px-4 py-3 text-sm font-bold"
        >
          {error}
        </p>
      ) : null}

      <div className="bg-pool-deep text-paper flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <div>
          <p className="font-display text-base font-extrabold">
            {mode === "create" ? "Lista para publicar" : "Guardar la noticia"}
          </p>
          <p className="text-paper/80 mt-0.5 text-sm">
            {audienceLabel}
            {pinned ? " · Destacada" : ""}
            {showExpiry ? " · Con caducidad" : ""}
          </p>
        </div>
        <Button
          type="submit"
          variant="gold"
          size="lg"
          disabled={pending}
          className="w-full rounded-xl sm:w-auto"
        >
          {mode === "create" ? (
            <Send aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Save aria-hidden="true" className="h-4 w-4" />
          )}
          {pending
            ? mode === "create"
              ? "Publicando…"
              : "Guardando…"
            : mode === "create"
              ? "Publicar noticia"
              : "Guardar cambios"}
        </Button>
      </div>

      {mode === "edit" && onDelete ? (
        <div className="border-ink-200 flex justify-end border-t pt-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => setDeleteOpen(true)}
            className="text-goggle-red hover:bg-goggle-red/5 focus-visible:ring-goggle-red inline-flex min-h-12 touch-manipulation items-center gap-2 rounded-xl px-3 text-sm font-bold focus-visible:ring-2 focus-visible:outline-none"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" /> Eliminar
          </button>
        </div>
      ) : null}

      <ConfirmActionSheet
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="¿Eliminar esta noticia?"
        description="Desaparecerá del tablón para todo el club."
        confirmLabel="Sí, eliminar"
        isPending={pending}
        error={error}
        onConfirm={deletePost}
      />
    </form>
  );
}
