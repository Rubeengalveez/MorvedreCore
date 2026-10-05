import { AdminPageShell } from "@/components/admin/admin-page";
import { getAdminTrainings } from "@/server/queries/admin-trainings";
import { TrainingManagement } from "./_components/training-management";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = { title: "Entrenamientos — Admin — Morvedre Core" };
export default async function TrainingsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; team?: string }>;
}) {
  const data = await getAdminTrainings(await searchParams);
  return (
    <AdminPageShell className="pt-1">
      {data ? (
        <TrainingManagement {...data} />
      ) : (
        <div className="border-pool-deep text-pool-deep rounded-2xl border-2 bg-white p-6 font-bold">
          Necesitas una temporada actual para crear entrenamientos.
        </div>
      )}
    </AdminPageShell>
  );
}
