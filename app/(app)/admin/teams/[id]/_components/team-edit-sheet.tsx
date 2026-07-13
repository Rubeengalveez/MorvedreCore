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
import { updateTeam, type Team } from "@/server/actions/admin";

const CATEGORY_OPTIONS = [
  "benjamin",
  "alevin",
  "infantil",
  "cadete",
  "juvenil",
  "absoluto",
  "escuela",
] as const;

const GENDER_OPTIONS: Array<{ value: "male" | "female" | "mixed"; label: string }> = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Femenino" },
  { value: "mixed", label: "Mixto" },
];

const TYPE_OPTIONS: Array<{ value: "competitive" | "school"; label: string }> = [
  { value: "competitive", label: "Competitivo" },
  { value: "school", label: "Escuela" },
];

const teamEditSchema = z
  .object({
    label: z.string().trim().min(1, "El nombre del equipo es obligatorio.").max(50),
    category_code: z.enum(CATEGORY_OPTIONS),
    gender: z.enum(["male", "female", "mixed"]),
    team_type: z.enum(["competitive", "school"]),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color inválido (#RRGGBB)."),
    home_pool: z.string().trim().max(100).optional().or(z.literal("")),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .refine(
    (data) => data.label.trim().length > 0 && data.label.length <= 50 && data.color.length > 0,
    { message: "Datos inválidos.", path: ["label"] },
  );

type TeamEditInput = z.input<typeof teamEditSchema>;
type TeamEditValues = z.output<typeof teamEditSchema>;

type ActionState = { ok?: true; error?: string } | null;

async function submitAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  try {
    await updateTeam(id, {
      label: String(formData.get("label") ?? ""),
      category_code: String(formData.get("category_code") ?? "") as Team["category_code"],
      gender: String(formData.get("gender") ?? "") as Team["gender"],
      team_type: String(formData.get("team_type") ?? "competitive") as "competitive" | "school",
      color: String(formData.get("color") ?? ""),
      home_pool: String(formData.get("home_pool") ?? "") || null,
      notes: String(formData.get("notes") ?? "") || null,
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

export interface TeamEditSheetProps {
  team: Team;
  trigger: React.ReactNode;
}

export function TeamEditSheet({ team, trigger }: TeamEditSheetProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(submitAction, null);
  const [, startTransition] = useTransition();

  const form = useForm<TeamEditInput, unknown, TeamEditValues>({
    resolver: zodResolver(teamEditSchema),
    defaultValues: {
      label: team.label,
      category_code: team.category_code,
      gender: team.gender,
      team_type: team.team_type,
      color: team.color,
      home_pool: team.home_pool ?? "",
      notes: team.notes ?? "",
    },
  });

  useEffect(() => {
    if (state?.ok && open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
  }, [state, open]);

  const onSubmit = form.handleSubmit((values) => {
    const fd = new FormData();
    fd.append("id", team.id);
    fd.append("label", values.label);
    fd.append("category_code", values.category_code);
    fd.append("gender", values.gender);
    fd.append("team_type", values.team_type);
    fd.append("color", values.color);
    if (values.home_pool) fd.append("home_pool", values.home_pool);
    if (values.notes) fd.append("notes", values.notes);
    startTransition(() => {
      formAction(fd);
    });
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent size="lg">
        <SheetHeader>
          <SheetTitle>Editar equipo</SheetTitle>
          <SheetDescription>
            Modifica la información del equipo. Los cambios afectan a la temporada
            {team.season_id ? "" : " actual"}.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Form {...form}>
            <form
              id={`team-edit-${team.id}`}
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
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input
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
                  name="category_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoría</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        >
                          {CATEGORY_OPTIONS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </Select>
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

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="team_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        >
                          {TYPE_OPTIONS.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            aria-label="Selector de color"
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            className="border-ink-300 bg-paper h-12 w-12 shrink-0 cursor-pointer rounded border p-1"
                          />
                          <Input
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            className="font-mono"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="home_pool"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Piscina habitual</FormLabel>
                    <FormControl>
                      <Input
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas</FormLabel>
                    <FormControl>
                      <Input
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
            </form>
          </Form>
        </SheetBody>
        <SheetFooter>
          <SubmitButton label="Guardar cambios" />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
