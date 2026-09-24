"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter,
  SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { createPersonnelProfile } from "@/server/actions/admin/players";

export function PersonnelProfileSheet() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await createPersonnelProfile({
          full_name: formData.get("full_name"),
          email: formData.get("email"),
          directiva: formData.get("directiva") === "on",
        });
        setOpen(false);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "No pudimos crear a esta persona.");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="md" variant="secondary" className="w-full sm:w-auto">
          <UserPlus className="h-5 w-5" aria-hidden="true" />
          Nueva persona
        </Button>
      </SheetTrigger>
      <SheetContent size="lg">
        <SheetHeader>
          <SheetTitle>Dar de alta a una persona</SheetTitle>
          <SheetDescription>
            Crea su perfil con el correo que usará para solicitar acceso. Después podrás asignarle un equipo o marcarla como directiva.
          </SheetDescription>
        </SheetHeader>
        <SheetBody>
          <form id="personnel-profile-form" action={submit} className="flex flex-col gap-5">
            {error ? <p role="alert" className="text-danger text-sm font-semibold">{error}</p> : null}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="personnel-name" className="text-pool-deep text-sm font-bold">Nombre completo</label>
              <Input id="personnel-name" name="full_name" required minLength={2} maxLength={100} autoComplete="name" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="personnel-email" className="text-pool-deep text-sm font-bold">Correo de acceso</label>
              <Input id="personnel-email" name="email" type="email" required autoComplete="email" />
            </div>
            <label className="bg-pool-foam/60 text-pool-deep flex min-h-12 items-center gap-3 rounded-xl p-3 text-sm font-semibold">
              <input type="checkbox" name="directiva" className="accent-pool-blue h-5 w-5" />
              Forma parte de la directiva
            </label>
            <p className="text-ink-600 text-sm">
              Los permisos de gestión se asignan por separado. La persona pedirá acceso desde «Personal y directiva» y tú aprobarás la vinculación.
            </p>
          </form>
        </SheetBody>
        <SheetFooter>
          <Button type="submit" form="personnel-profile-form" disabled={pending} className="w-full">
            {pending ? "Creando…" : "Crear persona"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
