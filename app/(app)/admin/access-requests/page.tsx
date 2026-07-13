import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { Route } from "next";
import { UserCheck } from "lucide-react";

import { AdminPageHeader, AdminPageShell } from "@/components/admin/admin-page";
import { createClient } from "@/lib/supabase/server";
import { AccessRequestsManager } from "@/app/(app)/admin/access-requests/_components/access-requests-manager";
import { getAccessRequests } from "@/server/actions/auth";

export const metadata: Metadata = {
  title: "Solicitudes de acceso — Morvedre Core",
  description: "Aprueba o rechaza las solicitudes de acceso al club.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AccessRequestsPage() {
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
    redirect("/dashboard" as Route);
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

  const requests = await getAccessRequests();

  return (
    <AdminPageShell width="lg">
      <AdminPageHeader
        title="Solicitudes de acceso"
        description="Revisa quién pide acceso y asigna el perfil correcto antes de aprobarlo."
        icon={<UserCheck className="h-6 w-6" aria-hidden="true" />}
      />
      <AccessRequestsManager initialRequests={requests} />
    </AdminPageShell>
  );
}
