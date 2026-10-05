import { render, screen } from "@testing-library/react";
import { Calendar, Phone } from "lucide-react";
import { describe, expect, it } from "vitest";
import { ActionGroup, ProfileIdentity } from "@/components/profile/profile-hub";
describe("Perfil compacto", () => {
  it("identifica la cuenta y permite editar sus datos", () => {
    render(
      <ProfileIdentity
        name="Rubén Gálvez Álvarez"
        photoUrl={null}
        teamColor="#1657a8"
        roleLabels={["Administrador", "Jugador"]}
      />,
    );
    expect(screen.getByRole("heading", { name: "Rubén Gálvez Álvarez" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Funciones en el club" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Editar mis datos" })).toHaveAttribute(
      "href",
      "/profile/edit",
    );
    expect(screen.queryByText(/activas$/)).not.toBeInTheDocument();
  });
  it("identifica un miembro sin funciones deportivas", () => {
    render(
      <ProfileIdentity name="Socio del club" photoUrl={null} teamColor="#1657a8" roleLabels={[]} />,
    );
    expect(screen.getByText("Miembro del club")).toBeInTheDocument();
  });
  it("cada acceso tiene un nombre y un destino propios", () => {
    render(
      <ActionGroup
        title="Mi cuenta"
        links={[
          { label: "Mis datos", href: "/profile/edit", icon: Phone },
          { label: "Mi calendario", href: "/profile/settings", icon: Calendar },
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Mis datos" })).toHaveAttribute(
      "href",
      "/profile/edit",
    );
    expect(screen.getByRole("link", { name: "Mi calendario" })).toHaveAttribute(
      "href",
      "/profile/settings",
    );
  });
});
