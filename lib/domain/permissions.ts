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

export interface AdminCapabilities {
  isAdmin: boolean;
  permissions: ReadonlySet<AdminPermission>;
  coachTeamIds: ReadonlySet<string>;
  matchStaffTeamIds: ReadonlySet<string>;
}

export type TeamCapability = "trainings" | "match_schedule" | "match_operations";

export function deriveAdminCapabilities(input: {
  isAdmin: boolean;
  permissions: readonly { permission: string }[];
  roles: readonly { role: string; scope_team_id: string | null }[];
  staff: readonly { role: string; team_id: string }[];
}): AdminCapabilities {
  const coachTeamIds = new Set<string>();
  const matchStaffTeamIds = new Set<string>();
  for (const role of input.roles) {
    if (!role.scope_team_id) continue;
    if (role.role === "coach") coachTeamIds.add(role.scope_team_id);
    if (role.role === "coach" || role.role === "delegate") {
      matchStaffTeamIds.add(role.scope_team_id);
    }
  }
  for (const staff of input.staff) {
    if (staff.role === "delegate") matchStaffTeamIds.add(staff.team_id);
  }
  return {
    isAdmin: input.isAdmin,
    permissions: new Set(input.permissions.map((row) => row.permission).filter(isAdminPermission)),
    coachTeamIds,
    matchStaffTeamIds,
  };
}

export function hasGlobalPermission(
  access: AdminCapabilities,
  permission: AdminPermission,
): boolean {
  return access.isAdmin || access.permissions.has(permission);
}

export function getTeamScope(
  access: AdminCapabilities,
  capability: TeamCapability,
): string[] | null {
  const permission = capability === "trainings" ? "manage_trainings" : "manage_matches";
  if (hasGlobalPermission(access, permission)) return null;
  return Array.from(
    capability === "match_operations" ? access.matchStaffTeamIds : access.coachTeamIds,
  );
}

export function canManageTeam(
  access: AdminCapabilities,
  capability: TeamCapability,
  teamId: string,
): boolean {
  const scope = getTeamScope(access, capability);
  return scope === null || scope.includes(teamId);
}

export function canAccessAdminModule(
  access: AdminCapabilities,
  permission: AdminPermission | "admin",
): boolean {
  if (permission === "admin") return access.isAdmin;
  if (permission === "manage_trainings" || permission === "manage_matches") {
    const scope = getTeamScope(
      access,
      permission === "manage_trainings" ? "trainings" : "match_operations",
    );
    return scope === null || scope.length > 0;
  }
  if (permission === "manage_attendance") return false;
  return hasGlobalPermission(access, permission);
}

export function canAccessAdminArea(access: AdminCapabilities): boolean {
  return (
    access.isAdmin ||
    ADMIN_PERMISSIONS.some((permission) => canAccessAdminModule(access, permission))
  );
}
