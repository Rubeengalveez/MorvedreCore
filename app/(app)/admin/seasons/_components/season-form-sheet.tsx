"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
import {
  createSeason,
  updateSeason,
  type Season,
} from "@/server/actions/admin";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida. Usa el formato AAAA-MM-DD.");

const seasonFormSchema = z
  .object({
    label: z.string().trim().min(3, "Mínimo 3 caracteres.").max(50, "Máximo 50 caracteres."),
    start_date: isoDate,
    end_date: isoDate,
  })
  .refine((data) => data.start_date < data.end_date, {
    message: "La fecha de fin debe ser posterior a la de inicio.",
    path: ["end_date"],
  });

type SeasonFormValues = z.infer<typeof seasonFormSchema>;

type FormMode =
  | { kind: "create" }
  | { kind: "edit"; season: Season };

type ActionState = { ok?: true; error?: string } | null;

async function submitAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const id = formData.get("id");
    const payload = {
      label: String(formData.get("label") ?? ""),
      start_date: String(formData.get("start_date") ?? ""),
      end_date: String(formData.get("end_date") ?? ""),
    };
    if (id) {
      await updateSeason(String(id), payload);
    } else {
      await createSeason(payload);
    }
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

export interface SeasonFormSheetProps {
  mode: FormMode;
  trigger: React.ReactNode;
}

export function SeasonFormSheet({ mode, trigger }: SeasonFormSheetProps) {
  const isEdit = mode.kind === "edit";
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    submitAction,
    null,
  );
  const [, startTransition] = useTransition();

  const form = useForm<SeasonFormValues>({
    resolver: zodResolver(seasonFormSchema),
    defaultValues:
      isEdit
        ? {
            label: mode.season.label,
            start_date: mode.season.start_date,
            end_date: mode.season.end_date,
          }
        : {
            label: "",
            start_date: "",
            end_date: "",
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
    if (isEdit) fd.append("id", mode.season.id);
    fd.append("label", values.label);
    fd.append("start_date", values.start_date);
    fd.append("end_date", values.end_date);
    startTransition(() => {
      formAction(fd);
    });
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent size="md">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar temporada" : "Nueva temporada"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Modifica las fechas o el nombre de la temporada."
              : "Crea la temporada actual y márcala como activa para empezar."}
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Form {...form}>
            <form
              id={`season-form-${isEdit ? mode.season.id : "new"}`}
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
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etiqueta</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="2026/2027"
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
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de inicio</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
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
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de fin</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
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
            </form>
          </Form>
        </SheetBody>
        <SheetFooter>
          <SubmitButton label={isEdit ? "Guardar cambios" : "Crear temporada"} />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
