import Link from "next/link";
import type { Route } from "next";
import { ChevronRight, Pencil, type LucideIcon } from "lucide-react";
import { AdaptivePlayerName } from "@/components/ui/adaptive-player-name";
import { PlayerPhoto } from "@/components/team/player-photo";
import { shopPrimary } from "@/components/shop/shop-ui";

export interface ProfileActionLink {
  href: string;
  label: string;
  detail?: string;
  icon: LucideIcon;
}

export function ProfileIdentity({
  name,
  photoUrl,
  teamColor,
  roleLabels,
}: {
  name: string;
  photoUrl: string | null;
  teamColor: string;
  roleLabels: string[];
}) {
  return (
    <section
      aria-label="Tu identidad"
      className="border-pool-deep overflow-hidden rounded-2xl border-2 bg-white"
    >
      <div className="bg-pool-deep px-4 py-5 text-white">
        <h2 className="mb-4 text-xl font-extrabold">
          <AdaptivePlayerName name={name} />
        </h2>
        <div className="flex items-center gap-5">
          <PlayerPhoto src={photoUrl} name={name} teamColor={teamColor} size={112} square />
          <ul aria-label="Funciones en el club" className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {(roleLabels.length ? roleLabels : ["Miembro del club"]).map((role) => (
              <li
                key={role}
                className="rounded-md border border-white/65 bg-white/10 px-2 py-1 text-sm font-semibold"
              >
                {role}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="p-3">
        <Link href="/profile/edit" className={`${shopPrimary} w-full`}>
          <Pencil aria-hidden="true" className="h-5 w-5" />
          Editar mis datos
        </Link>
      </div>
    </section>
  );
}

export function ActionGroup({
  title,
  links,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  links: ProfileActionLink[];
}) {
  if (!links.length) return null;
  return (
    <section className="border-pool-deep/70 overflow-hidden rounded-2xl border-2 bg-white">
      <h2 className="bg-pool-deep px-4 py-3 text-lg font-extrabold text-white">{title}</h2>
      <div className="space-y-2 p-2">
        {links.map((item) => (
          <SettingsLink key={item.href} {...item} />
        ))}
      </div>
    </section>
  );
}

export function SettingsLink({ href, label, detail, icon: Icon }: ProfileActionLink) {
  return (
    <Link
      href={href as Route}
      className="border-pool-deep/65 text-pool-deep focus-visible:outline-pool-blue flex min-h-14 items-center gap-3 rounded-xl border bg-blue-50/70 px-3 py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 active:bg-blue-100"
    >
      <Icon aria-hidden="true" className="text-pool-blue h-5 w-5 shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-base font-extrabold">{label}</span>
        {detail && <span className="mt-0.5 block text-sm font-medium">{detail}</span>}
      </span>
      <ChevronRight aria-hidden="true" className="text-pool-blue h-5 w-5 shrink-0" />
    </Link>
  );
}
