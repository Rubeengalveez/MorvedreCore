import { StatusPage } from "@/components/ui/status-page";

export default function NotFound() {
  return (
    <StatusPage
      eyebrow="Página no encontrada"
      title="Aquí no hay agua"
      description="La pantalla que buscas no existe o ha cambiado de sitio. Vuelve a Inicio para continuar."
    />
  );
}
