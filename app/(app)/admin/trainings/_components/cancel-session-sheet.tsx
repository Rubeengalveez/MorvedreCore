"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
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
import { cancelTrainingSession } from "@/server/actions/admin";

const formSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(2, "Indica un motivo (mínimo 2 caracteres).")
    .max(500, "Máximo 500 caracteres."),
});

type FormValues = z.infer<typeof formSchema>;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
      {pending ? "Cancelando..." : label}
    </Button>
  );
}

export interface CancelSessionSheetProps {
  sessionId: string;
  trigger: React.ReactNode;
  onDone?: () => void;
}

export function CancelSessionSheet({ sessionId, trigger, onDone }: CancelSessionSheetProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { reason: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      try {
        await cancelTrainingSession(sessionId, values.reason);
        form.reset();
        onDone?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No pudimos cancelar.");
      }
    });
  });

  return (
    <form
      id={`cancel-session-${sessionId}`}
      onSubmit={onSubmit}
      className="flex flex-col gap-4"
      noValidate
    >
      {error ? (
        <Alert variant="danger" title="Error">
          {error}
        </Alert>
      ) : null}
      <Form {...form}>
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motivo de la cancelación</FormLabel>
              <FormControl>
                <Input
                  placeholder="Lluvia, festivos, avería..."
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
      </Form>
      <SubmitButton label="Cancelar sesión" />
      <span className="sr-only" aria-live="polite">
        {pending ? "Cancelando" : ""}
      </span>
      {trigger}
    </form>
  );
}
