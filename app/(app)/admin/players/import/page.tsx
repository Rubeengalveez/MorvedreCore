import { FileSpreadsheet } from "lucide-react";

import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-page";
import { PageBackLink } from "@/components/ui/page-back-link";
import { ImportPlayersPanel } from "./_components/import-players-panel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Importar jugadores — Admin — Morvedre Core",
};

export default function ImportPlayersPage() {
  return (
    <AdminPageShell className="gap-4">
      <PageBackLink href="/admin/players">Volver a jugadores</PageBackLink>
      <AdminPageHeader
        title="Importar jugadores"
        description="Sube tu Excel con las columnas de nombre, año, dorsal, equipo y tutor. Revisarás los datos antes de guardarlos."
        icon={<FileSpreadsheet className="h-6 w-6" aria-hidden="true" />}
      />
      <ImportPlayersPanel />
    </AdminPageShell>
  );
}
