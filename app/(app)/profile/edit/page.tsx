import { redirect } from "next/navigation";
import { PageShell } from "@/components/ui/page-shell";
import { ProfileForm } from "@/app/(app)/profile/profile-form";
import { getSelfProfile } from "@/server/queries/self-profile";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Mis datos — Morvedre Core" };

export default async function ProfileEditPage() {
  const data = await getSelfProfile();
  if (!data) redirect("/login");
  return (
    <PageShell width="md" className="gap-3 pb-5">
      <ProfileForm profile={data.profile} isPlayer={data.isPlayer} loginEmail={data.loginEmail} />
    </PageShell>
  );
}
