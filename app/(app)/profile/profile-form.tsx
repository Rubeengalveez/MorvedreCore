"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, LockKeyhole, Save } from "lucide-react";
import { AvatarEditor } from "@/components/profile/avatar-editor";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import { CapNumberOptions } from "@/components/matches/cap-number-picker";
import {
  ShopSection,
  ShopField,
  shopControl,
  shopPrimary,
  shopSecondary,
} from "@/components/shop/shop-ui";
import {
  selfProfileSchema,
  selfProfilePayload,
  type SelfProfileValues,
  type EditableSelfProfile,
} from "@/lib/domain/self-profile";
import { updateProfile } from "@/server/actions/profile";
import { useProfileBackGuard } from "@/components/profile/use-profile-back-guard";

export function ProfileForm({
  profile,
  isPlayer,
  loginEmail = null,
}: {
  profile: EditableSelfProfile;
  isPlayer: boolean;
  loginEmail?: string | null;
}) {
  const router = useRouter();
  const initial: SelfProfileValues = {
    full_name: profile.full_name,
    phone_e164: profile.phone_e164 ?? "",
    email_contact: profile.email_contact ?? "",
    cap_number: profile.cap_number,
  };
  const [values, setValues] = useState(initial);
  const [file, setFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [stage, setStage] = useState<"edit" | "review" | "discard">("edit");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const busy = useRef(false);
  const destination = useRef("/profile");
  const form = useRef<HTMLFormElement>(null);
  const dirty =
    JSON.stringify(selfProfilePayload(values)) !== JSON.stringify(selfProfilePayload(initial)) ||
    Boolean(file) ||
    removePhoto;
  const exit = useProfileBackGuard(() => leave());
  useEffect(() => {
    if (!dirty) return;
    const protect = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", protect);
    const navigate = (event: MouseEvent) => {
      const link = (event.target as Element)?.closest("a[href]");
      if (
        !link ||
        event.defaultPrevented ||
        event.button ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        link.getAttribute("target") === "_blank"
      )
        return;
      const url = new URL(link.getAttribute("href")!, window.location.href);
      if (
        url.origin !== window.location.origin ||
        (url.pathname === window.location.pathname && url.hash)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      if (busy.current) return;
      destination.current = `${url.pathname}${url.search}${url.hash}`;
      setStage("discard");
    };
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", protect);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty]);
  function leave() {
    destination.current = "/profile";
    if (dirty) setStage("discard");
    else exit("/profile");
  }
  function review() {
    if (!dirty || busy.current) return;
    const result = selfProfileSchema.safeParse(values);
    if (!result.success) {
      const fields = Object.fromEntries(
        result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      );
      setErrors(fields);
      const name = String(result.error.issues[0]?.path[0]);
      form.current?.querySelector<HTMLInputElement>(`[name="${name}"]`)?.focus();
      return;
    }
    setErrors({});
    setError(null);
    setStage("review");
  }
  async function save() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const fd = new FormData();
      const payload = selfProfilePayload(values);
      for (const [key, value] of Object.entries(payload))
        if (isPlayer || key !== "cap_number") fd.set(key, value == null ? "" : String(value));
      fd.set("updated_at", profile.updated_at);
      fd.set("remove_photo", String(removePhoto));
      if (file) fd.set("avatar_file", file);
      const result = await updateProfile(null, fd);
      if (!result?.ok) {
        setError(result?.error ?? "No pudimos guardar. Vuelve a intentarlo.");
        return;
      }
      exit("/profile");
      router.refresh();
    } catch {
      setError("No pudimos guardar. Comprueba tu conexión y vuelve a intentarlo.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  function input(name: "full_name" | "phone_e164" | "email_contact", label: string, type = "text") {
    return (
      <ShopField label={label} htmlFor={name}>
        <input
          id={name}
          name={name}
          type={type}
          value={values[name]}
          autoComplete={name === "full_name" ? "name" : name === "phone_e164" ? "tel" : "email"}
          onChange={(event) => {
            setValues((v) => ({ ...v, [name]: event.target.value }));
            setErrors((e) => ({ ...e, [name]: "" }));
          }}
          className={shopControl}
          aria-invalid={Boolean(errors[name])}
          aria-describedby={errors[name] ? `${name}-error` : undefined}
        />
        {errors[name] && (
          <p id={`${name}-error`} role="alert" className="font-semibold text-red-900">
            {errors[name]}
          </p>
        )}
      </ShopField>
    );
  }
  const next = selfProfilePayload(values),
    before = selfProfilePayload(initial);
  const labels: Record<keyof typeof next, string> = {
    full_name: "Nombre",
    phone_e164: "Teléfono",
    email_contact: "Correo de contacto",
    cap_number: "Gorro preferido",
  };
  return (
    <>
      <button
        type="button"
        onClick={leave}
        disabled={pending}
        data-page-back
        className="text-pool-blue focus-visible:outline-pool-blue -mb-2 -ml-2 inline-flex min-h-12 w-fit items-center gap-2 rounded-xl px-2 font-extrabold focus-visible:outline-2"
      >
        <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        Mi perfil
      </button>
      <h1 className="text-pool-deep text-3xl font-extrabold">Mis datos</h1>
      <form
        ref={form}
        onSubmit={(event) => {
          event.preventDefault();
          review();
        }}
        noValidate
        className="space-y-3"
      >
        <ShopSection title="Datos personales">
          {input("full_name", "Nombre completo")}
          <div className="border-pool-deep/65 rounded-xl border bg-blue-50 px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-pool-deep font-bold">Año de nacimiento</span>
              <span className="text-pool-deep text-lg font-extrabold">
                {profile.birth_year ?? "Sin registrar"}
              </span>
            </div>
          </div>
        </ShopSection>
        <div id="photo" className="scroll-mt-28">
          <AvatarEditor
            name={values.full_name || profile.full_name}
            currentUrl={profile.photo_url}
            teamColor={profile.team_color ?? "var(--pool-blue)"}
            onChange={(photo, remove) => {
              setFile(photo);
              setRemovePhoto(remove);
            }}
          />
        </div>
        <ShopSection title="Contacto privado">
          {input("phone_e164", "Teléfono", "tel")}
          {input("email_contact", "Correo de contacto", "email")}
          <p className="text-pool-deep flex items-center gap-2 text-sm font-medium">
            <LockKeyhole className="h-4 w-4 shrink-0" aria-hidden="true" />
            Tu contacto no aparece en la ficha pública.
          </p>
        </ShopSection>
        {isPlayer && (
          <ShopSection title="Gorro preferido">
            <div id="cap_number" className="scroll-mt-28">
              <CapNumberOptions
                value={values.cap_number}
                occupied={new Set()}
                unavailable={new Set()}
                onChange={(cap) => setValues((v) => ({ ...v, cap_number: cap }))}
              />
            </div>
            <p className="text-pool-deep text-sm font-medium">
              El entrenador o delegado asigna el gorro de cada partido.
            </p>
          </ShopSection>
        )}
        {loginEmail && (
          <div className="border-pool-deep/65 text-pool-deep rounded-xl border-2 bg-white p-4">
            <h2 className="font-extrabold">Correo para entrar</h2>
            <p className="mt-1 font-medium break-all">{loginEmail}</p>
          </div>
        )}
        <div className="grid gap-2">
          <button type="submit" className={`${shopPrimary} w-full`} disabled={!dirty || pending}>
            <Save aria-hidden="true" className="h-5 w-5" />
            Revisar y guardar
          </button>
          <button
            type="button"
            className={`${shopSecondary} w-full`}
            onClick={leave}
            disabled={pending}
          >
            Cancelar
          </button>
        </div>
      </form>
      <ActaGuardSheet
        open={stage === "review"}
        onOpenChange={(open) => !open && setStage("edit")}
        context="MIS DATOS"
        title="¿Guardar estos cambios?"
        tall
        icon="saved"
        pending={pending}
        error={error}
        body={
          <dl className="space-y-2">
            {Object.entries(next)
              .filter(([key, value]) => value !== before[key as keyof typeof next])
              .map(([key, value]) => (
                <div key={key} className="border-pool-deep/65 rounded-xl border-2 bg-white p-3">
                  <dt className="text-pool-blue text-sm font-bold">
                    {labels[key as keyof typeof next]}
                  </dt>
                  <dd className="text-pool-deep mt-1 font-extrabold break-words">
                    {value ?? (key === "cap_number" ? "Sin gorro" : "Sin registrar")}
                  </dd>
                </div>
              ))}
            {(file || removePhoto) && (
              <div className="border-pool-deep/65 rounded-xl border-2 bg-white p-3">
                <dt className="text-pool-blue text-sm font-bold">Foto</dt>
                <dd className="text-pool-deep font-extrabold">
                  {file ? "Nueva foto" : "Quitar foto actual"}
                </dd>
              </div>
            )}
          </dl>
        }
        actions={[
          { label: "Guardar cambios", tone: "primary", onClick: save },
          { label: "Volver a editar", tone: "secondary", onClick: () => setStage("edit") },
        ]}
      />
      <ActaGuardSheet
        open={stage === "discard"}
        onOpenChange={(open) => !open && setStage("edit")}
        context="MIS DATOS"
        title="¿Salir sin guardar?"
        summary="Tienes cambios pendientes"
        description="Si sales ahora, estos cambios no se guardarán."
        icon="warning"
        actions={[
          { label: "Seguir editando", tone: "primary", onClick: () => setStage("edit") },
          {
            label: "Salir sin guardar",
            tone: "subtle",
            onClick: () => exit(destination.current),
          },
        ]}
      />
    </>
  );
}
