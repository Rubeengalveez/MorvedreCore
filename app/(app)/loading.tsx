"use client";

import { usePathname } from "next/navigation";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { ProfileLoading } from "@/components/profile/profile-feedback";

export default function AppLoading() {
  const path = usePathname();
  if (path === "/profile" || path.startsWith("/profile/")) return <ProfileLoading />;
  if (path.startsWith("/notifications"))
    return <ProfileLoading title="Notificaciones" message="Preparando tus avisos…" />;
  if (path === "/treasury") return <ProfileLoading title="Cuotas y pagos" />;
  if (path === "/attendance/history") return <ProfileLoading title="Asistencia" />;
  if (path.startsWith("/players/") && path.endsWith("/swim-times"))
    return <ProfileLoading title="Tiempos de nado" />;
  return <PageSkeleton />;
}
