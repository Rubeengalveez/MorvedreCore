import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

const ACTIVE_COOKIE = "morvedre_active_profile_id";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!profile) redirect("/login");

  const cookieStore = await cookies();
  const activeId = cookieStore.get(ACTIVE_COOKIE)?.value ?? null;

  let firstName = profile.full_name.split(" ")[0] ?? profile.full_name;

  if (activeId && activeId !== profile.id) {
    const { data: link } = await supabase
      .from("parent_child_links")
      .select("profiles!parent_child_links_child_profile_id_fkey(full_name)")
      .eq("parent_profile_id", profile.id)
      .eq("child_profile_id", activeId)
      .maybeSingle();

    if (link) {
      const child = Array.isArray(link.profiles) ? link.profiles[0] : link.profiles;
      if (child && typeof child === "object" && "full_name" in child) {
        const name = (child as { full_name: string }).full_name;
        firstName = name.split(" ")[0] ?? name;
      }
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-deep">
          Hola, {firstName}
        </h1>
        <p className="text-base leading-relaxed text-ink-600">
          Tu primer partido está al caer. Pronto tendrás todo aquí.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Tu próxima aventura</CardTitle>
          <CardDescription>
            Tu próximo partido o entreno aparecerá aquí.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-ink-600">
            Aún no tienes partidos esta temporada. Cuando los haya, aparecerán
            primero aquí.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimas noticias</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-ink-600">
            Sin novedades en el club. Cuando las haya, aparecerán aquí primero.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tu actividad</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-ink-600">
            Tu historial se construirá con cada partido. Sé el primero en
            aparecer en el Pichichi.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
