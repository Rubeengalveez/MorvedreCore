import { redirect } from "next/navigation";

export default async function MatchSheetRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/acta?match=${id}`);
}
