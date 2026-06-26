import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Route } from "next";

import {
  Balon,
  Gorro,
  Ola,
  SilbatoActivo,
  Usuario,
} from "@/components/brand/pictograms";
import { ActionCard } from "@/components/ui/action-card";
import { PictogramTile } from "@/components/ui/pictogram-tile";
import { WaterDivider } from "@/components/ui/water-divider";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    <div className="flex w-full flex-col">
      <div className="mx-auto w-full max-w-2xl px-4 pb-6 pt-6">
        <h1 className="font-display text-[32px] font-extrabold leading-[1.1] tracking-tight text-brand-deep">
          Hola, {firstName}
        </h1>
      </div>

      <WaterDivider fill="var(--brand-foam)" height={40} />

      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <ActionCard
          accentColor="var(--brand-blue)"
          pictogram={
            <Ola
              className="h-[50px] w-[50px]"
              accent="var(--brand-action)"
            />
          }
          title="Tu primer partido está al caer"
          subtitle="Vitaliy está preparando la convocatoria"
          meta="Cuando esté lista, aparecerá aquí"
          cta={{ label: "Ir al calendario", href: "/calendar" as Route }}
        />
      </div>

      <WaterDivider fill="var(--brand-foam)" height={40} variant="footer" />

      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="grid grid-cols-3 divide-x divide-ink-300 overflow-hidden rounded-md border border-ink-300 bg-paper">
          <Stat
            pictogram={
              <Balon className="h-6 w-6" accent="var(--brand-ball)" />
            }
            value="0"
            label="Goles esta temporada"
          />
          <Stat
            pictogram={
              <Gorro className="h-6 w-6" accent="var(--brand-blue)" />
            }
            value="—"
            label="% Asistencia"
          />
          <Stat
            pictogram={<Usuario className="h-6 w-6" />}
            value="—"
            label="Tu dorsal"
          />
        </div>
      </div>

      <WaterDivider fill="var(--brand-foam)" height={40} />

      <div className="mx-auto w-full max-w-2xl px-4 pb-12 pt-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PictogramTile
            icon={
              <SilbatoActivo
                className="h-9 w-9"
                accent="var(--brand-aqua)"
              />
            }
            title="Últimas noticias"
            description="Aquí verás los avisos del club"
          />
          <PictogramTile
            icon={
              <Ola className="h-9 w-9" accent="var(--brand-aqua)" />
            }
            title="Tu actividad"
            description="Tus próximos eventos y resultados"
          />
        </div>
      </div>
    </div>
  );
}

function Stat({
  pictogram,
  value,
  label,
}: {
  pictogram: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 px-2 py-5 text-center">
      <div className="shrink-0">{pictogram}</div>
      <span className="font-mono text-[32px] font-bold leading-none text-brand-deep">
        {value}
      </span>
      <span className="text-xs font-medium text-ink-600">{label}</span>
    </div>
  );
}
