import { redirect } from "next/navigation";
import type { Route } from "next";

import { getRenderAdminAccess } from "@/server/actions/admin/_helpers";
import { canAccessAdminArea } from "@/lib/domain/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Administración — Morvedre Core",
  description: "Gestión de temporadas, equipos, jugadores, familias y personal.",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const access = await getRenderAdminAccess();
  if (!canAccessAdminArea(access)) {
    redirect("/dashboard" as Route);
  }

  return <div className="flex flex-col">{children}</div>;
}
