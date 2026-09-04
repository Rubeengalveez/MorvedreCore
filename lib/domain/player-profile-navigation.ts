export function getPlayerProfileBackTarget(source: string | undefined, teamId: string) {
  if (source === "profile") {
    return {
      href: "/profile",
      label: "Volver a mi perfil",
    };
  }

  return {
    href: `/team/${teamId}?tab=jugadores`,
    label: "Volver a la plantilla",
  };
}
