import {
  Banknote,
  Bell,
  CalendarCheck2,
  CircleUserRound,
  ClipboardCheck,
  ShieldCheck,
  Shirt,
  UsersRound,
} from "lucide-react";

import type { ProfileActionLink } from "@/components/profile/profile-hub";
import type { AdminPermission } from "@/lib/domain/permissions";

export function getProfilePermissionLinks(
  permissionValues: Iterable<AdminPermission>,
): ProfileActionLink[] {
  const permissions = new Set(permissionValues);

  return [
    permissions.has("manage_shop")
      ? {
          href: "/admin/shop",
          label: "Gestionar tienda",
          detail: "Productos, pedidos y entregas",
          icon: Shirt,
        }
      : null,
    permissions.has("manage_teams")
      ? {
          href: "/admin/teams",
          label: "Gestionar equipos",
          detail: "Plantillas y cuerpo técnico",
          icon: UsersRound,
        }
      : null,
    permissions.has("manage_players")
      ? {
          href: "/admin/players",
          label: "Gestionar jugadores",
          detail: "Altas, datos y estado",
          icon: CircleUserRound,
        }
      : null,
    permissions.has("manage_families")
      ? {
          href: "/admin/families",
          label: "Gestionar familias",
          detail: "Tutores y menores vinculados",
          icon: UsersRound,
        }
      : null,
    permissions.has("manage_treasury")
      ? {
          href: "/admin/treasury",
          label: "Gestionar tesorería",
          detail: "Cuotas, ajustes y cierres",
          icon: Banknote,
        }
      : null,
    permissions.has("manage_news")
      ? {
          href: "/admin/news",
          label: "Publicar noticias",
          detail: "Comunicados del club",
          icon: Bell,
        }
      : null,
    permissions.has("manage_matches")
      ? {
          href: "/admin/matches",
          label: "Gestionar partidos",
          detail: "Convocatorias, actas y logística",
          icon: ClipboardCheck,
        }
      : null,
    permissions.has("manage_trainings")
      ? {
          href: "/admin/trainings",
          label: "Gestionar entrenamientos",
          detail: "Horarios, sesiones y asistencia",
          icon: CalendarCheck2,
        }
      : null,
    permissions.has("manage_staff")
      ? {
          href: "/admin/staff",
          label: "Gestionar personal",
          detail: "Funciones y permisos",
          icon: ShieldCheck,
        }
      : null,
  ].filter((link): link is ProfileActionLink => link != null);
}
