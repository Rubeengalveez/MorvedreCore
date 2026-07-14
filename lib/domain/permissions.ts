export const ADMIN_PERMISSIONS = [
  "manage_attendance",
  "manage_shop",
  "manage_teams",
  "manage_players",
  "manage_families",
  "manage_treasury",
  "manage_news",
  "manage_matches",
  "manage_trainings",
  "manage_staff",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<AdminPermission, string> = {
  manage_attendance: "Pasar lista",
  manage_shop: "Gestionar tienda",
  manage_teams: "Editar equipos",
  manage_players: "Gestionar jugadores",
  manage_families: "Gestionar familias",
  manage_treasury: "Gestionar tesorería",
  manage_news: "Publicar noticias",
  manage_matches: "Gestionar partidos",
  manage_trainings: "Gestionar entrenamientos",
  manage_staff: "Gestionar personal",
};

export function isAdminPermission(value: string): value is AdminPermission {
  return (ADMIN_PERMISSIONS as readonly string[]).includes(value);
}
