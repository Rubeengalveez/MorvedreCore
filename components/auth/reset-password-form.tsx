"use client";

import * as React from "react";
import { useActionState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
import { requestPasswordReset, type PasswordResetState } from "@/server/actions/auth";

const emailSchema = z.object({
  email: z.string().email("Introduce un email válido."),
});

type EmailValues = z.infer<typeof emailSchema>;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
      {pending ? "Enviando…" : "Enviar enlace"}
    </Button>
  );
}

export function ResetPasswordForm() {
  const [state, formAction] = useActionState<PasswordResetState, FormData>(
    requestPasswordReset,
    null,
  );
  const [, startTransition] = useTransition();

  const form = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    const fd = new FormData();
    fd.append("email", values.email);
    startTransition(() => {
      formAction(fd);
    });
  });

  if (state?.success) {
    return (
      <Alert variant="success" title="Te hemos enviado un enlace">
        Revisa tu bandeja de entrada. El enlace caduca en 1 hora.
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex w-full flex-col gap-5" noValidate>
        {state?.error ? (
          <Alert variant="danger" title="No pudimos enviar el email">
            {state.error}
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="email">Email</FormLabel>
              <FormControl>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="tu@email.com…"
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

        <SubmitButton />
      </form>
    </Form>
  );
}
