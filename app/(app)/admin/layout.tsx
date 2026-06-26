import { redirect } from "next/navigation";
import type { Route } from "next";

import { AdminTabs } from "@/app/(app)/admin/_components/admin-tabs";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Administración — Morvedre Core",
  description: "Gestión de temporadas, equipos, jugadores, familias y personal.",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login" as Route);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/login" as Route);
  }

  const { data: adminRole } = await supabase
    .from("user_roles")
    .select("role")
    .eq("profile_id", profile.id)
    .eq("role", "admin")
    .is("scope_team_id", null)
    .maybeSingle();

  if (!adminRole) {
    redirect("/dashboard" as Route);
  }

  return (
    <div className="flex flex-col">
      <AdminTabs />
      {children}
    </div>
  );
}
