"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useForm } from "react-hook-form";
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
import { createPlayer } from "@/server/actions/admin";

const GENDER_OPTIONS = [
  { value: "prefer_not_to_say", label: "Prefiero no decirlo" },
  { value: "male", label: "Masculino" },
  { value: "female", label: "Femenino" },
  { value: "other", label: "Otro" },
] as const;

const yearPattern = /^\d{4}$/;
const dorsalPattern = /^\d{1,2}$/;
const e164Pattern = /^\+[1-9]\d{6,14}$/;
const urlPattern = /^https?:\/\/.+/;
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const playerFormSchema = z.object({
  full_name: z.string().trim().min(2, "Mínimo 2 caracteres.").max(100),
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
      (v) => !v || (dorsalPattern.test(v) && Number(v) >= 0 && Number(v) <= 99),
      "Dorsal entre 0 y 99.",
    ),
  phone_e164: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || e164Pattern.test(v), "Formato E.164: +34612345678"),
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
  must_change_password: z.boolean(),
  license_active: z.boolean().optional(),
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
    await createPlayer({
      full_name: String(formData.get("full_name") ?? ""),
      gender: String(formData.get("gender") ?? "prefer_not_to_say") as
        | "male"
        | "female"
        | "other"
        | "prefer_not_to_say",
      birth_year: Number(birthYear),
      cap_number: cap && String(cap).trim() !== "" ? Number(cap) : undefined,
      phone_e164: String(formData.get("phone_e164") ?? "") || undefined,
      email_contact: String(formData.get("email_contact") ?? "") || undefined,
      photo_url: String(formData.get("photo_url") ?? "") || undefined,
      must_change_password: formData.get("must_change_password") === "true",
      license_active: formData.get("license_active") === "true",
      notes: String(formData.get("notes") ?? "") || undefined,
    });
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No pudimos guardar." };
  }
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
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
          "focus-visible:ring-brand-blue focus-visible:ring-offset-paper relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none " +
          (value ? "bg-brand-blue" : "bg-ink-300")
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
  trigger: React.ReactNode;
}

export function PlayerFormSheet({ trigger }: PlayerFormSheetProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(submitAction, null);
  const [, startTransition] = useTransition();

  const form = useForm<PlayerFormValues>({
    resolver: zodResolver(playerFormSchema),
    defaultValues: {
      full_name: "",
      birth_year: "",
      gender: "prefer_not_to_say",
      cap_number: "",
      phone_e164: "",
      email_contact: "",
      photo_url: "",
      must_change_password: true,
      license_active: false,
      notes: "",
    },
  });

  useEffect(() => {
    if (state?.ok) {
      form.reset();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state, form]);

  const onSubmit = form.handleSubmit((values) => {
    const fd = new FormData();
    fd.append("full_name", values.full_name);
    fd.append("birth_year", values.birth_year ?? "");
    fd.append("gender", values.gender);
    if (values.cap_number) fd.append("cap_number", values.cap_number);
    if (values.phone_e164) fd.append("phone_e164", values.phone_e164);
    if (values.email_contact) fd.append("email_contact", values.email_contact);
    if (values.photo_url) fd.append("photo_url", values.photo_url);
    fd.append("must_change_password", values.must_change_password ? "true" : "false");
    fd.append("license_active", values.license_active ? "true" : "false");
    if (values.notes && values.notes.trim() !== "") fd.append("notes", values.notes);
    startTransition(() => {
      formAction(fd);
    });
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent size="lg">
        <SheetHeader>
          <SheetTitle>Nuevo jugador</SheetTitle>
          <SheetDescription>
            Da de alta a un jugador. El dorsal y el equipo se asignan después.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Form {...form}>
            <form
              id="player-form-new"
              onSubmit={onSubmit}
              className="flex flex-col gap-5 pb-2"
              noValidate
            >
              {state?.error ? (
                <Alert variant="danger" title="No pudimos guardar">
                  {state.error}
                </Alert>
              ) : null}

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
                    <FormLabel>Dorsal (opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={99}
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

              <FormField
                control={form.control}
                name="photo_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL de la foto</FormLabel>
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

              <FormField
                control={form.control}
                name="must_change_password"
                render={({ field }) => (
                  <FormItem>
                    <Toggle
                      value={field.value}
                      onChange={field.onChange}
                      label="Deberá cambiar la contraseña"
                      description="Recomendado al dar de alta un jugador nuevo."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="license_active"
                render={({ field }) => (
                  <FormItem>
                    <Toggle
                      value={field.value ?? false}
                      onChange={field.onChange}
                      label="Licencia federativa activa"
                      description="Marca si el jugador tiene ficha federativa en vigor."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas internas (opcional)</FormLabel>
                    <FormControl>
                      <textarea
                        rows={4}
                        placeholder="Información útil para el club: alergias, observaciones, etc."
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        className="border-ink-300 bg-paper text-ink-900 placeholder:text-ink-600/70 focus-visible:border-brand-blue focus-visible:ring-brand-blue focus-visible:ring-offset-paper flex w-full rounded border px-4 py-3 text-base transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </SheetBody>
        <SheetFooter>
          <SubmitButton label="Crear jugador" />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
