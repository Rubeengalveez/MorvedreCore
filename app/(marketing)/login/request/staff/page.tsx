import { AuthRequestShell } from "@/components/auth/auth-request-shell";
import { AccessRequestStaffForm } from "@/components/auth/access-request-staff-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Acceso de personal — Morvedre Core" };

export default async function StaffRequestPage({ searchParams }: {
  searchParams: Promise<{ email?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawEmail = Array.isArray(params.email) ? params.email[0] : params.email;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const googleUser = user?.identities?.some((identity) => identity.provider === "google") ? user : null;
  const email = googleUser?.email ?? (typeof rawEmail === "string" ? rawEmail : "");
  return <AuthRequestShell title="Acceso de personal" subtitle="Para entrenadores, delegados y directiva dados de alta por el club.">
    <AccessRequestStaffForm email={email} lockedEmail={!!googleUser} />
  </AuthRequestShell>;
}
