"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useActionState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import {
  updateProfile,
  type UpdateProfileState,
} from "@/server/actions/profile";
import type { Tables } from "@/types/database";

const yearPattern = /^\d{4}$/;
const dorsalPattern = /^\d{1,2}$/;
const e164Pattern = /^\+[1-9]\d{6,14}$/;
const urlPattern = /^https?:\/\/.+/;
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const profileFormSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres.")
    .max(100, "Máximo 100 caracteres."),
  photo_url: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || urlPattern.test(v), "URL inválida."),
  birth_year: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) =>
        !v ||
        (yearPattern.test(v) &&
          Number(v) >= 1900 &&
          Number(v) <= 2100),
      "Año entre 1900 y 2100.",
    ),
  cap_number: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) =>
        !v ||
        (dorsalPattern.test(v) && Number(v) >= 0 && Number(v) <= 99),
      "Dorsal entre 0 y 99.",
    ),
  license_active: z.boolean(),
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
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      ) : null}
      {pending ? "Guardando..." : "Guardar"}
    </Button>
  );
}

export interface ProfileFormProps {
  profile: Tables<"profiles">;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [state, formAction] = useActionState<UpdateProfileState, FormData>(
    updateProfile,
    null,
  );
  const [, startTransition] = useTransition();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: profile.full_name,
      photo_url: profile.photo_url ?? "",
      birth_year: profile.birth_year?.toString() ?? "",
      cap_number: profile.cap_number?.toString() ?? "",
      license_active: profile.license_active,
      phone_e164: profile.phone_e164 ?? "",
      email_contact: profile.email_contact ?? "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    const fd = new FormData();
    fd.append("full_name", values.full_name);
    fd.append("photo_url", values.photo_url ?? "");
    fd.append("birth_year", values.birth_year ?? "");
    fd.append("cap_number", values.cap_number ?? "");
    fd.append("license_active", values.license_active ? "on" : "");
    fd.append("phone_e164", values.phone_e164 ?? "");
    fd.append("email_contact", values.email_contact ?? "");
    startTransition(() => {
      formAction(fd);
    });
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        {state?.ok ? (
          <Alert variant="success" title="Cambios guardados">
            Tus datos se han actualizado correctamente.
          </Alert>
        ) : null}
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
              <FormLabel htmlFor="full_name">Nombre completo</FormLabel>
              <FormControl>
                <Input
                  id="full_name"
                  autoComplete="name"
                  placeholder="Tu nombre"
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

        <FormField
          control={form.control}
          name="photo_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="photo_url">URL de la foto</FormLabel>
              <FormControl>
                <Input
                  id="photo_url"
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
              <FormDescription>
                Pega el enlace a tu foto. Podrás subir un archivo más adelante.
              </FormDescription>
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
                <FormLabel htmlFor="birth_year">Año de nacimiento</FormLabel>
                <FormControl>
                  <Input
                    id="birth_year"
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
            name="cap_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="cap_number">Dorsal</FormLabel>
                <FormControl>
                  <Input
                    id="cap_number"
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
        </div>

        <FormField
          control={form.control}
          name="license_active"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Licencia federativa</FormLabel>
              <FormControl>
                <button
                  type="button"
                  role="switch"
                  aria-checked={field.value}
                  onClick={() => field.onChange(!field.value)}
                  className={cn(
                    "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
                    field.value ? "bg-brand-blue" : "bg-ink-300",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "inline-block h-5 w-5 rounded-full bg-paper transition-transform",
                      field.value ? "translate-x-6" : "translate-x-1",
                    )}
                  />
                </button>
              </FormControl>
              <FormDescription>
                Marca si tu licencia federativa está activa esta temporada.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone_e164"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="phone_e164">Teléfono (E.164)</FormLabel>
              <FormControl>
                <Input
                  id="phone_e164"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+34612345678"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormDescription>
                Visible solo para ti, el admin y los entrenadores de tu equipo.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email_contact"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="email_contact">Email de contacto</FormLabel>
              <FormControl>
                <Input
                  id="email_contact"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="tu@email.com"
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

        <SubmitButton />
      </form>
    </Form>
  );
}
