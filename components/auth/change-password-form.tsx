"use client";

import * as React from "react";
import { useActionState, useTransition } from "react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { ActaGuardSheet } from "@/components/matches/acta-guard-sheet";
import { z } from "zod";
import { accountPasswordSchema } from "@/lib/domain/account-password";

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
import { authFieldClass } from "@/components/auth/auth-field-style";
import { updatePassword, type UpdatePasswordState } from "@/server/actions/auth";

type ChangePasswordValues = z.infer<typeof accountPasswordSchema>;

export function ChangePasswordForm({
  returnTo = "/dashboard",
}: {
  returnTo?: "/dashboard" | "/profile/settings";
}) {
  const [state, formAction, pending] = useActionState<UpdatePasswordState, FormData>(
    updatePassword,
    null,
  );
  const [, startTransition] = useTransition();
  const [review, setReview] = React.useState(false);
  const [visible, setVisible] = React.useState(false);

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(accountPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = form.handleSubmit(() => {
    if (!pending) setReview(true);
  });
  function save() {
    if (pending) return;
    const values = form.getValues();
    const fd = new FormData();
    fd.append("returnTo", returnTo);
    fd.append("newPassword", values.newPassword);
    fd.append("confirmPassword", values.confirmPassword);
    startTransition(() => {
      formAction(fd);
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex w-full flex-col gap-5" noValidate>
        {state?.error ? (
          <Alert variant="danger" title="No pudimos guardar la contraseña">
            {state.error}
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="newPassword" className="text-pool-deep text-base font-bold">
                Nueva contraseña
              </FormLabel>
              <FormControl>
                <Input
                  id="newPassword"
                  type={visible ? "text" : "password"}
                  autoComplete="new-password"

                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  className={`${authFieldClass} border-pool-deep/65 border-2 text-base`}
                />
              </FormControl>
              <FormMessage className="text-red-800" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="confirmPassword" className="text-pool-deep text-base font-bold">
                Repite la contraseña
              </FormLabel>
              <FormControl>
                <Input
                  id="confirmPassword"
                  type={visible ? "text" : "password"}
                  autoComplete="new-password"

                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  className={`${authFieldClass} border-pool-deep/65 border-2 text-base`}
                />
              </FormControl>
              <FormMessage className="text-red-800" />
            </FormItem>
          )}
        />

        <p className="text-pool-deep text-sm font-semibold">
          Utiliza al menos 10 caracteres, con letras y números.
        </p>
        <button
          type="button"
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
          className="border-pool-deep text-pool-deep flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 bg-blue-50 text-base font-bold"
        >
          {visible ? (
            <EyeOff aria-hidden="true" className="h-5 w-5" />
          ) : (
            <Eye aria-hidden="true" className="h-5 w-5" />
          )}
          {visible ? "Ocultar contraseñas" : "Mostrar contraseñas"}
        </button>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          Cambiar contraseña
        </Button>
        <ActaGuardSheet
          open={review}
          onOpenChange={setReview}
          context="Seguridad"
          title="¿Cambiar tu contraseña?"
          icon="saved"
          summary="Usarás la nueva contraseña para entrar"
          description="Guárdala en un lugar seguro. Nunca la compartas."
          error={state?.error}
          pending={pending}
          actions={[
            { label: "Confirmar cambio", tone: "primary", onClick: save },
            { label: "Seguir editando", tone: "secondary", onClick: () => setReview(false) },
          ]}
        />
      </form>
    </Form>
  );
}
