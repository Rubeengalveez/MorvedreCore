import Link from "next/link";
import type { Route } from "next";
import {
  CalendarDays,
  CalendarRange,
  ChevronRight,
  ClipboardList,
  ContactRound,
  HandCoins,
  Newspaper,
  ShoppingBag,
  UserRound,
  UserRoundCheck,
  UsersRound,
  Waves,
  type LucideIcon,
} from "lucide-react";

import {
  canAccessAdminModule,
  type AdminCapabilities,
  type AdminPermission,
} from "@/lib/domain/permissions";

interface AdminModule {
  href: Route;
  label: string;
  description: string;
  icon: LucideIcon;
  permission: AdminPermission | "admin";
  group: "Gestión diaria" | "Personas" | "Organización";
}

const ADMIN_MODULES: readonly AdminModule[] = [
  {
    href: "/admin/matches",
    label: "Partidos",
    description: "Convocatorias y actas",
    icon: CalendarDays,
    permission: "manage_matches",
    group: "Gestión diaria",
  },
  {
    href: "/admin/trainings",
    label: "Entrenamientos",
    description: "Horarios y sesiones",
    icon: Waves,
    permission: "manage_trainings",
    group: "Gestión diaria",
  },
  {
    href: "/admin/shop",
    label: "Tienda",
    description: "Productos y pedidos",
    icon: ShoppingBag,
    permission: "manage_shop",
    group: "Gestión diaria",
  },
  {
    href: "/admin/treasury",
    label: "Tesorería",
    description: "Cuotas y cierres mensuales",
    icon: HandCoins,
    permission: "manage_treasury",
    group: "Gestión diaria",
  },
  {
    href: "/admin/news",
    label: "Noticias",
    description: "Avisos del club",
    icon: Newspaper,
    permission: "manage_news",
    group: "Gestión diaria",
  },
  {
    href: "/admin/players",
    label: "Jugadores",
    description: "Altas y datos personales",
    icon: UserRound,
    permission: "manage_players",
    group: "Personas",
  },
  {
    href: "/admin/families",
    label: "Familias",
    description: "Madres, padres e hijos",
    icon: UsersRound,
    permission: "manage_families",
    group: "Personas",
  },
  {
    href: "/admin/staff",
    label: "Personal",
    description: "Funciones y permisos",
    icon: ContactRound,
    permission: "manage_staff",
    group: "Personas",
  },
  {
    href: "/admin/access-requests",
    label: "Solicitudes de acceso",
    description: "Altas pendientes de aprobar",
    icon: UserRoundCheck,
    permission: "admin",
    group: "Personas",
  },
  {
    href: "/admin/teams",
    label: "Equipos",
    description: "Plantillas y cuerpo técnico",
    icon: ClipboardList,
    permission: "manage_teams",
    group: "Organización",
  },
  {
    href: "/admin/seasons",
    label: "Temporadas",
    description: "Crear y archivar temporadas",
    icon: CalendarRange,
    permission: "admin",
    group: "Organización",
  },
];

export function AdminHomeMenu({ access }: { access: AdminCapabilities }) {
  const modules = ADMIN_MODULES.filter((module) => canAccessAdminModule(access, module.permission));
  const groups = (["Gestión diaria", "Personas", "Organización"] as const)
    .map((title) => ({ title, modules: modules.filter((module) => module.group === title) }))
    .filter((group) => group.modules.length > 0);

  return (
    <nav aria-label="Funciones de administración" className="space-y-5">
      {groups.map((group) => (
        <section key={group.title} aria-labelledby={`admin-${group.modules[0].permission}`}>
          <h2
            id={`admin-${group.modules[0].permission}`}
            className={
              groups.length > 1
                ? "bg-pool-deep mb-3 rounded-xl px-4 py-3 text-lg font-extrabold text-white"
                : "sr-only"
            }
          >
            {group.title}
          </h2>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {group.modules.map((module) => (
              <li key={module.href}>
                <AdminModuleLink module={module} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}

function AdminModuleLink({ module }: { module: AdminModule }) {
  const Icon = module.icon;
  return (
    <Link
      href={module.href}
      className="border-pool-deep/65 text-pool-deep focus-visible:outline-pool-blue flex h-full min-h-20 items-center gap-3 rounded-2xl border-2 bg-white px-3 py-3 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 active:bg-blue-100"
    >
      <span
        aria-hidden="true"
        className="bg-pool-deep flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
      >
        <Icon className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-lg leading-snug font-extrabold">{module.label}</span>
        <span className="mt-0.5 block text-sm leading-snug font-medium">{module.description}</span>
      </span>
      <ChevronRight aria-hidden="true" className="text-pool-blue h-5 w-5 shrink-0" />
    </Link>
  );
}
