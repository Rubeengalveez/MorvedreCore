export function teamAdminOrigin(teamId: string, from?: string, adminTab?: string) {
  if (from === "profile")
    return { context: "from=profile", href: "/profile/activity", label: "Mi actividad" };
  const tab = adminTab === "personal" || adminTab === "datos" ? adminTab : "plantilla";
  const context = from === "admin" ? `from=admin&adminTab=${tab}` : "";
  return {
    context,
    href: context ? `/admin/teams/${teamId}?tab=${tab}` : "/team",
    label: context ? "Volver a gestionar el equipo" : "Todos los equipos",
  };
}

export function teamNestedOrigin(context = "") {
  const origin = new URLSearchParams(context);
  const params = new URLSearchParams();
  if (origin.get("from") === "profile") params.set("teamFrom", "profile");
  if (origin.get("from") === "admin") {
    params.set("teamFrom", "admin");
    const tab = origin.get("adminTab");
    params.set("teamAdminTab", tab === "personal" || tab === "datos" ? tab : "plantilla");
  }
  return params;
}
