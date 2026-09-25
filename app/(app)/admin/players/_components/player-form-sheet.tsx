"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createPlayer, updatePlayer } from "@/server/actions/admin";
import { normalizeSpanishPhone } from "@/lib/domain/phone";

const GENDER_OPTIONS = [
  { value: "prefer_not_to_say", label: "Prefiero no decirlo" },
  { value: "male", label: "Masculino" },
  { value: "female", label: "Femenino" },
  { value: "other", label: "Otro" },
] as const;

const yearPattern = /^\d{4}$/;
const dorsalPattern = /^\d{1,2}$/;
const urlPattern = /^https?:\/\/.+/;
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const playerFormSchema = z.object({
  full_name: z.string().trim().min(2, "Mínimo 2 caracteres.").max(100),
  team_id: z.string().optional(),
  birth_year: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || (yearPattern.test(v) && Number(v) >= 1900 && Number(v) <= 2100),
      "Año entre 1900 y 2100.",
    ),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  cap_number: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || (dorsalPattern.test(v) && Number(v) >= 1 && Number(v) <= 14),
      "Gorro entre 1 y 14.",
    ),
  phone_e164: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || normalizeSpanishPhone(v) != null, "Escribe un teléfono válido."),
  email_contact: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || emailPattern.test(v), "Email inválido."),
  photo_url: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || urlPattern.test(v), "URL inválida."),
  school_enrolled: z.boolean(),
  school_payment_paid: z.boolean(),
  notes: z.string().trim().max(2000, "Máximo 2000 caracteres.").optional(),
});

type PlayerFormValues = z.infer<typeof playerFormSchema>;

type ActionState = { ok?: true; error?: string } | null;

async function submitAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const birthYear = formData.get("birth_year");
    const cap = formData.get("cap_number");
    if (!birthYear || String(birthYear).trim() === "") {
      return { error: "El año de nacimiento es obligatorio." };
    }
    const profileId = String(formData.get("profile_id") ?? "");
    const commonValues = {
      full_name: String(formData.get("full_name") ?? ""),
      gender: String(formData.get("gender") ?? "prefer_not_to_say") as
        "male" | "female" | "other" | "prefer_not_to_say",
      birth_year: Number(birthYear),
      school_enrolled: formData.get("school_enrolled") === "true",
      school_payment_paid: formData.get("school_payment_paid") === "true",
    };
    const capNumber = cap && String(cap).trim() !== "" ? Number(cap) : null;
    const phone = normalizeSpanishPhone(String(formData.get("phone_e164") ?? ""));
    const email = String(formData.get("email_contact") ?? "").trim();
    const photoUrl = String(formData.get("photo_url") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();
    if (profileId) {
      await updatePlayer(profileId, {
        ...commonValues,
        cap_number: capNumber,
        phone_e164: phone,
        email_contact: email || null,
        photo_url: photoUrl || null,
        notes: notes || null,
      });
    } else {
      await createPlayer({
        ...commonValues,
        team_id: String(formData.get("team_id") ?? ""),
        cap_number: capNumber ?? undefined,
        phone_e164: phone ?? undefined,
        email_contact: email || undefined,
        photo_url: photoUrl || undefined,
        notes: notes || undefined,
      });
    }
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No pudimos guardar." };
  }
}

function SubmitButton({ form, label, pending }: { form: string; label: string; pending: boolean }) {
  return (
    <Button type="submit" form={form} size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
      {pending ? "Guardando..." : label}
    </Button>
  );
}

function Toggle({
  value,
  onChange,
  label,
  description,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  const id = React.useId();
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="flex cursor-pointer flex-col gap-0.5">
        <span className="text-ink-900 text-sm font-semibold">{label}</span>
        {description ? <span className="text-ink-600 text-xs">{description}</span> : null}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        onClick={() => onChange(!value)}
        className={
          "focus-visible:ring-pool-blue focus-visible:ring-offset-paper relative inline-flex min-h-12 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none " +
          (value ? "bg-pool-blue" : "bg-ink-300")
        }
      >
        <span
          aria-hidden="true"
          className={
            "bg-paper inline-block h-5 w-5 rounded-full transition-transform " +
            (value ? "translate-x-6" : "translate-x-1")
          }
        />
      </button>
    </div>
  );
}

export interface PlayerFormSheetProps {
  teams?: Array<{ id: string; label: string }>;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  player?: {
    id: string;
    full_name: string;
    birth_year: number | null;
    gender: string | null;
    cap_number: number | null;
    phone_e164: string | null;
    email_contact: string | null;
    photo_url: string | null;
    notes: string | null;
    school_enrolled: boolean;
    school_payment_paid: boolean;
  };
}

export function PlayerFormSheet({ trigger, open, onOpenChange, player, teams = [] }: PlayerFormSheetProps) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [state, setState] = useState<ActionState>(null);
  const [isSaving, startTransition] = useTransition();
  const isControlled = open !== undefined;
  const sheetOpen = open ?? uncontrolledOpen;
  const formId = player ? `player-form-${player.id}` : "player-form-new";

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    if (!isControlled) setUncontrolledOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }, [isControlled, onOpenChange]);

  const form = useForm<PlayerFormValues>({
    resolver: zodResolver(playerFormSchema),
    defaultValues: {
      full_name: player?.full_name ?? "",
      team_id: "",
      birth_year: player?.birth_year?.toString() ?? "",
      gender: (player?.gender as PlayerFormValues["gender"]) ?? "prefer_not_to_say",
      cap_number: player?.cap_number != null && player.cap_number >= 1 && player.cap_number <= 14 ? String(player.cap_number) : "",
      phone_e164: player?.phone_e164 ?? "",
      email_contact: player?.email_contact ?? "",
      photo_url: player?.photo_url ?? "",
      school_enrolled: player?.school_enrolled ?? false,
      school_payment_paid: player?.school_payment_paid ?? false,
      notes: player?.notes ?? "",
    },
  });
  const schoolEnrolled = useWatch({ control: form.control, name: "school_enrolled" });

  const onSubmit = form.handleSubmit((values) => {
    const fd = new FormData();
    if (player) fd.append("profile_id", player.id);
    fd.append("full_name", values.full_name);
    if (!player) fd.append("team_id", values.team_id ?? "");
    fd.append("birth_year", values.birth_year ?? "");
    fd.append("gender", values.gender);
    if (values.cap_number) fd.append("cap_number", values.cap_number);
    if (values.phone_e164) fd.append("phone_e164", values.phone_e164);
    if (values.email_contact) fd.append("email_contact", values.email_contact);
    if (values.photo_url) fd.append("photo_url", values.photo_url);
    fd.append("school_enrolled", values.school_enrolled ? "true" : "false");
    fd.append("school_payment_paid", values.school_payment_paid ? "true" : "false");
    if (values.notes && values.notes.trim() !== "") fd.append("notes", values.notes);
    startTransition(async () => {
      const result = await submitAction(null, fd);
      setState(result);
      if (result?.ok) {
        form.reset();
        handleOpenChange(false);
        router.refresh();
      }
    });
  });

  return (
    <Sheet open={sheetOpen} onOpenChange={handleOpenChange}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent size="lg">
        <SheetHeader>
          <span className="bg-pool-foam text-pool-blue mb-1 flex h-11 w-11 items-center justify-center rounded-xl">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <SheetTitle>{player ? "Editar jugador" : "Nuevo jugador"}</SheetTitle>
          <SheetDescription>
            {player
              ? "Actualiza sus datos sin perder estadísticas ni historial."
              : "Da de alta al jugador con su equipo principal. Después podrá solicitar acceso a su perfil."}
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Form {...form}>
            <form id={formId} onSubmit={onSubmit} className="flex flex-col gap-5 pb-2" noValidate>
              {state?.error ? (
                <Alert variant="danger" title="No pudimos guardar">
                  {state.error}
                </Alert>
              ) : null}

              <section className="border-ink-200 bg-paper-card shadow-elev-1 space-y-4 rounded-2xl border p-4">
                <div>
                  <h3 className="text-pool-deep font-extrabold">Ficha deportiva</h3>
                  <p className="text-ink-600 mt-0.5 text-sm">Identificación, edad y dorsal.</p>
                </div>
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre completo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Carlos García"
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {!player ? (
                  <FormField
                    control={form.control}
                    name="team_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipo principal</FormLabel>
                        <FormControl>
                          <Select {...field} required>
                            <option value="">Selecciona un equipo</option>
                            {teams.map((team) => <option key={team.id} value={team.id}>{team.label}</option>)}
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : null}

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="birth_year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Año de nacimiento</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={1900}
                            max={2100}
                            placeholder="2009"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Género</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          >
                            {GENDER_OPTIONS.map((g) => (
                              <option key={g.value} value={g.value}>
                                {g.label}
                              </option>
                            ))}
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="cap_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gorro (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={14}
                          placeholder="7"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <section className="border-ink-200 bg-paper-card shadow-elev-1 space-y-4 rounded-2xl border p-4">
                <div>
                  <h3 className="text-pool-deep font-extrabold">Contacto y perfil</h3>
                  <p className="text-ink-600 mt-0.5 text-sm">
                    Datos privados para la gestión del club.
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="photo_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Foto de perfil (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          inputMode="url"
                          placeholder="https://..."
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <p className="text-ink-500 text-xs">
                        Pega un enlace a una foto. Puedes dejarlo vacío.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone_e164"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          inputMode="tel"
                          placeholder="+34612345678"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <p className="text-ink-500 text-xs leading-relaxed">
                        Recomendado para que la encargada de la tienda pueda contactar si hace un
                        pedido.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email_contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email de contacto (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          inputMode="email"
                          placeholder="tutor@email.com"
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <section className="border-ink-200 bg-paper-card shadow-elev-1 flex flex-col gap-3 rounded-2xl border p-4">
                <div>
                  <h3 className="text-pool-deep text-sm font-extrabold">Escuela</h3>
                  <p className="text-ink-600 mt-0.5 text-xs">
                    Úsalo solo para el grupo especial de Escuela.
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="school_enrolled"
                  render={({ field }) => (
                    <FormItem>
                      <Toggle
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value);
                          if (!value) form.setValue("school_payment_paid", false);
                        }}
                        label="Está inscrito en Escuela"
                      />
                    </FormItem>
                  )}
                />
                {schoolEnrolled ? (
                  <FormField
                    control={form.control}
                    name="school_payment_paid"
                    render={({ field }) => (
                      <FormItem>
                        <Toggle
                          value={field.value}
                          onChange={field.onChange}
                          label="Cuota de Escuela pagada"
                        />
                      </FormItem>
                    )}
                  />
                ) : null}
              </section>

              <section className="border-ink-200 bg-paper-card shadow-elev-1 space-y-3 rounded-2xl border p-4">
                <div>
                  <h3 className="text-pool-deep font-extrabold">Notas internas</h3>
                  <p className="text-ink-600 mt-0.5 text-sm">Solo para la gestión del club.</p>
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <textarea
                          rows={4}
                          placeholder="Información útil para el club: alergias, observaciones, etc."
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          className="border-ink-300 bg-paper text-ink-900 placeholder:text-ink-600/70 focus-visible:border-pool-blue focus-visible:ring-pool-blue focus-visible:ring-offset-paper flex w-full rounded border px-4 py-3 text-base transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>
            </form>
          </Form>
        </SheetBody>
        <SheetFooter>
          <SubmitButton
            form={formId}
            label={player ? "Guardar cambios" : "Crear jugador"}
            pending={isSaving}
          />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
