"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
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
import { updateProfile, type UpdateProfileState } from "@/server/actions/profile";
import type { Tables } from "@/types/database";
import { AvatarEditor } from "@/components/profile/avatar-editor";
import { normalizeSpanishPhone } from "@/lib/domain/phone";

const yearPattern = /^\d{4}$/;
const dorsalPattern = /^\d{1,2}$/;
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const profileFormSchema = z.object({
  full_name: z.string().trim().min(2, "Mínimo 2 caracteres.").max(100, "Máximo 100 caracteres."),
  birth_year: z
    .string()
    .trim()
    .optional()
    .refine(
      (v) => !v || (yearPattern.test(v) && Number(v) >= 1900 && Number(v) <= 2100),
      "Año entre 1900 y 2100.",
    ),
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
    .refine((v) => !v || normalizeSpanishPhone(v) != null, "Escribe un teléfono válido."),
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
      {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
      {pending ? "Guardando..." : "Guardar"}
    </Button>
  );
}

export interface ProfileFormProps {
  profile: Tables<"profiles">;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState<UpdateProfileState, FormData>(updateProfile, null);
  const [, startTransition] = useTransition();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  useEffect(() => {
    if (!state?.ok) return;
    const timeout = window.setTimeout(() => router.push("/profile"), 800);
    return () => window.clearTimeout(timeout);
  }, [router, state?.ok]);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: profile.full_name,
      birth_year: profile.birth_year?.toString() ?? "",
      cap_number: profile.cap_number?.toString() ?? "",
      phone_e164: profile.phone_e164 ?? "",
      email_contact: profile.email_contact ?? "",
    },
  });
  const watchedFullName = useWatch({ control: form.control, name: "full_name" });

  const onSubmit = form.handleSubmit((values) => {
    const fd = new FormData();
    fd.append("full_name", values.full_name);
    fd.append("birth_year", values.birth_year ?? "");
    fd.append("cap_number", values.cap_number ?? "");
    fd.append("phone_e164", normalizeSpanishPhone(values.phone_e164 ?? "") ?? "");
    fd.append("email_contact", values.email_contact ?? "");
    if (avatarFile) fd.append("avatar_file", avatarFile);
    fd.append("remove_photo", String(removePhoto));
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

        <AvatarEditor
          name={watchedFullName || profile.full_name}
          currentUrl={profile.photo_url}
          teamColor={profile.team_color ?? "var(--pool-blue)"}
          onChange={(file, removeCurrent) => {
            setAvatarFile(file);
            setRemovePhoto(removeCurrent);
          }}
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
          name="phone_e164"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="phone_e164">Teléfono de contacto</FormLabel>
              <FormControl>
                <Input
                  id="phone_e164"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="612 345 678"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <FormDescription>
                Recomendado para que la encargada de tienda pueda localizarte si haces un pedido.
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

        <div className="flex flex-col gap-3">
          <SubmitButton />
          <Link
            href={"/profile" as Route}
            className="text-pool-blue text-center text-sm font-semibold hover:underline focus-visible:underline focus-visible:outline-none"
          >
            Volver a mi perfil
          </Link>
        </div>
      </form>
    </Form>
  );
}
