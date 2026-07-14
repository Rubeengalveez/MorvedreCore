import { redirect } from "next/navigation";
import type { Route } from "next";

import { getAdminAccess } from "@/server/actions/admin/_helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Administración — Morvedre Core",
  description: "Gestión de temporadas, equipos, jugadores, familias y personal.",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const access = await getAdminAccess().catch(() => null);
  if (!access) redirect("/login" as Route);
  if (!access.isAdmin && access.permissions.size === 0) {
    redirect("/dashboard" as Route);
  }

  return <div className="flex flex-col">{children}</div>;
}
