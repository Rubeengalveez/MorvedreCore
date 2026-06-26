"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
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
import {
  CATEGORY_LABELS,
  CATEGORY_DEFAULT_GENDER,
  type CategoryCode,
  type TeamGender,
} from "@/lib/domain/categories";
import { defaultTeamColor } from "@/lib/domain/teams";
import { createTeam, type Season } from "@/server/actions/admin";

const CATEGORY_OPTIONS: CategoryCode[] = [
  "benjamin",
  "alevin",
  "infantil",
  "cadete",
  "juvenil",
  "absoluto",
  "escuela",
];

const GENDER_OPTIONS: Array<{ value: TeamGender; label: string }> = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Femenino" },
  { value: "mixed", label: "Mixto" },
];

const TYPE_OPTIONS: Array<{ value: "competitive" | "school"; label: string }> = [
  { value: "competitive", label: "Competitivo" },
  { value: "school", label: "Escuela" },
];

const teamFormSchema = z.object({
  season_id: z.string().uuid("Selecciona una temporada."),
  category_code: z.enum([
    "benjamin",
    "alevin",
    "infantil",
    "cadete",
    "juvenil",
    "absoluto",
    "escuela",
  ]),
  label: z.string().trim().min(1, "El nombre del equipo es obligatorio.").max(50),
  gender: z.enum(["male", "female", "mixed"]),
  team_type: z.enum(["competitive", "school"]),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color inválido (#RRGGBB)."),
  home_pool: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

type TeamFormValues = z.infer<typeof teamFormSchema>;

type ActionState = { ok?: true; error?: string } | null;

async function submitAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await createTeam({
      season_id: String(formData.get("season_id") ?? ""),
      category_code: String(formData.get("category_code") ?? "") as CategoryCode,
      label: String(formData.get("label") ?? ""),
      gender: String(formData.get("gender") ?? "") as TeamGender,
      team_type: String(formData.get("team_type") ?? "competitive") as
        | "competitive"
        | "school",
      color: String(formData.get("color") ?? ""),
      home_pool: String(formData.get("home_pool") ?? "") || undefined,
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

export interface TeamFormSheetProps {
  seasons: Season[];
  defaultSeasonId: string;
  trigger: React.ReactNode;
}

export function TeamFormSheet({ seasons, defaultSeasonId, trigger }: TeamFormSheetProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    submitAction,
    null,
  );
  const [, startTransition] = useTransition();

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      season_id: defaultSeasonId,
      category_code: "benjamin",
      label: "",
      gender: CATEGORY_DEFAULT_GENDER.benjamin,
      team_type: "competitive",
      color: defaultTeamColor("benjamin"),
      home_pool: "",
      notes: "",
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const watchedCategory = form.watch("category_code");

  useEffect(() => {
    form.setValue("gender", CATEGORY_DEFAULT_GENDER[watchedCategory], {
      shouldDirty: false,
    });
    form.setValue("color", defaultTeamColor(watchedCategory), {
      shouldDirty: false,
    });
  }, [watchedCategory, form]);

  useEffect(() => {
    if (state?.ok) {
      form.reset();
      setOpen(false);
    }
  }, [state, form]);

  const onSubmit = form.handleSubmit((values) => {
    const fd = new FormData();
    fd.append("season_id", values.season_id);
    fd.append("category_code", values.category_code);
    fd.append("label", values.label);
    fd.append("gender", values.gender);
    fd.append("team_type", values.team_type);
    fd.append("color", values.color);
    if (values.home_pool) fd.append("home_pool", values.home_pool);
    if (values.notes) fd.append("notes", values.notes);
    startTransition(() => {
      formAction(fd);
    });
  });

  const seasonOptions = useMemo(
    () =>
      seasons.map((s) => ({
        id: s.id,
        label: `${s.label}${s.is_current ? " (actual)" : ""}${s.archived_at ? " (archivada)" : ""}`,
      })),
    [seasons],
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent size="lg">
        <SheetHeader>
          <SheetTitle>Nuevo equipo</SheetTitle>
          <SheetDescription>
            Crea un equipo para la temporada seleccionada. El color se hereda de la
            categoría, pero puedes ajustarlo.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Form {...form}>
            <form
              id="team-form-new"
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
                name="season_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temporada</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      >
                        {seasonOptions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </Select>
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
                              {CATEGORY_LABELS[c]}
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

              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del equipo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Cadete B"
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
                            className="h-12 w-12 shrink-0 cursor-pointer rounded border border-ink-300 bg-paper p-1"
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
                        placeholder="Piscina del Puerto"
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
          <SubmitButton label="Crear equipo" />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
