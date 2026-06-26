"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Trash2 } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Input } from "@/components/ui/input";
import { assignStaff, unassignStaff } from "@/server/actions/admin";

const ROLE_OPTIONS = [
  { value: "head_coach", label: "Entrenador principal" },
  { value: "assistant_coach", label: "Entrenador asistente" },
  { value: "delegate", label: "Delegado" },
  { value: "physical_trainer", label: "Preparador físico" },
] as const;

const RELATION_OPTIONS: Record<(typeof ROLE_OPTIONS)[number]["value"], string> = {
  head_coach: "Entrenador principal",
  assistant_coach: "Entrenador asistente",
  delegate: "Delegado",
  physical_trainer: "Preparador físico",
};

const staffSchema = z.object({
  profile_id: z.string().uuid("Persona inválida."),
  role: z.enum(["head_coach", "assistant_coach", "delegate", "physical_trainer"]),
});

type StaffValues = z.infer<typeof staffSchema>;

type ActionState = { ok?: true; error?: string } | null;

async function submitAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const teamId = String(formData.get("team_id") ?? "");
  try {
    await assignStaff({
      team_id: teamId,
      profile_id: String(formData.get("profile_id") ?? ""),
      role: String(formData.get("role") ?? "head_coach") as StaffValues["role"],
    });
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No pudimos asignar." };
  }
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
      {pending ? "Asignando..." : label}
    </Button>
  );
}

export interface StaffAssignSheetProps {
  teamId: string;
  candidates: Array<{ id: string; full_name: string; category_code: string | null }>;
  trigger: React.ReactNode;
}

export function StaffAssignSheet({
  teamId,
  candidates,
  trigger,
}: StaffAssignSheetProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ActionState, FormData>(
    submitAction,
    null,
  );
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  const form = useForm<StaffValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: { profile_id: "", role: "head_coach" },
  });

  useEffect(() => {
    if (state?.ok && open) {
      form.reset({ profile_id: "", role: "head_coach" });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearch("");
      setOpen(false);
    }
  }, [state, form, open]);

  const filtered = candidates.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()),
  );

  const onSubmit = form.handleSubmit((values) => {
    const fd = new FormData();
    fd.append("team_id", teamId);
    fd.append("profile_id", values.profile_id);
    fd.append("role", values.role);
    startTransition(() => {
      formAction(fd);
    });
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent size="lg">
        <SheetHeader>
          <SheetTitle>Añadir personal</SheetTitle>
          <SheetDescription>
            Selecciona la persona y el rol que tendrá en este equipo.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <Form {...form}>
            <form
              id={`staff-form-${teamId}`}
              onSubmit={onSubmit}
              className="flex flex-col gap-4 pb-2"
              noValidate
            >
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rol</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
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
                name="profile_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Persona</FormLabel>
                    <FormControl>
                      <div className="flex flex-col gap-2">
                        <Input
                          type="search"
                          placeholder="Buscar por nombre"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                        <Select
                          value={field.value}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          size={10}
                        >
                          <option value="">Selecciona una persona</option>
                          {filtered.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.full_name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </SheetBody>
        <SheetFooter>
          <SubmitButton label="Asignar" />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export interface StaffListProps {
  teamId: string;
  staff: Array<{ profile_id: string; role: StaffValues["role"]; full_name: string }>;
}

export function StaffList({ teamId, staff }: StaffListProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleRemove(profileId: string, role: StaffValues["role"], name: string) {
    if (!window.confirm(`¿Quitar a ${name} del equipo?`)) {
      return;
    }
    const key = `${profileId}-${role}`;
    setPendingId(key);
    startTransition(async () => {
      try {
        await unassignStaff({ team_id: teamId, profile_id: profileId, role });
      } finally {
        setPendingId(null);
      }
    });
  }

  if (staff.length === 0) {
    return (
      <p className="text-sm italic text-ink-600">
        Aún no has asignado personal a este equipo.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {staff.map((s) => {
        const key = `${s.profile_id}-${s.role}`;
        return (
          <li
            key={key}
            className="flex items-center justify-between gap-3 rounded-md border border-ink-300 bg-paper px-4 py-3"
          >
            <div className="flex flex-col">
              <span className="font-display text-base font-bold text-brand-deep">
                {s.full_name}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-600">
                {RELATION_OPTIONS[s.role]}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-12 w-12 p-0 text-danger hover:bg-danger/10"
              aria-label={`Quitar ${s.full_name}`}
              disabled={pendingId === key}
              onClick={() => handleRemove(s.profile_id, s.role, s.full_name)}
            >
              {pendingId === key ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              )}
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
