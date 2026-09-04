import { render, screen } from "@testing-library/react";
import { Camera, Hash, Phone } from "lucide-react";
import { describe, expect, it } from "vitest";

import { ProfileIdentity, ProfileReadiness } from "@/components/profile/profile-hub";

describe("ProfileIdentity", () => {
  it("presents multiple club functions in a single identity board", () => {
    render(
      <ProfileIdentity
        name="Rubén Gálvez Álvarez"
        photoUrl={null}
        teamColor="#1657a8"
        roleLabels={["Administrador", "Entrenador", "Jugador"]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Rubén Gálvez Álvarez" })).toBeInTheDocument();
    expect(screen.getByText("Funciones en el club")).toBeInTheDocument();
    expect(screen.getByText(/activas$/)).toHaveTextContent("03 activas");
    expect(screen.getByText("Administrador")).toBeInTheDocument();
    expect(screen.getByText("Entrenador")).toBeInTheDocument();
    expect(screen.getByText("Jugador")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Editar tu perfil" })).toHaveAttribute(
      "href",
      "/profile/edit",
    );
  });

  it("keeps an empty role set understandable", () => {
    render(
      <ProfileIdentity name="Socio del club" photoUrl={null} teamColor="#1657a8" roleLabels={[]} />,
    );

    expect(screen.getByText("Miembro del club")).toBeInTheDocument();
    expect(screen.getByText("00")).toBeInTheDocument();
  });
});

describe("ProfileReadiness", () => {
  it("links every missing player datum to its exact editor section", () => {
    render(
      <ProfileReadiness
        completed={1}
        items={[
          {
            label: "Foto",
            complete: false,
            icon: Camera,
            href: "/profile/edit#photo",
          },
          {
            label: "Teléfono",
            complete: false,
            icon: Phone,
            href: "/profile/edit#phone_e164",
          },
          {
            label: "Gorro",
            complete: true,
            icon: Hash,
            href: "/profile/edit#cap_number",
          },
        ]}
      />,
    );

    expect(screen.getByRole("link", { name: "Añadir foto" })).toHaveAttribute(
      "href",
      "/profile/edit#photo",
    );
    expect(screen.getByRole("link", { name: "Añadir teléfono" })).toHaveAttribute(
      "href",
      "/profile/edit#phone_e164",
    );
    expect(screen.getByRole("link", { name: "Editar gorro" })).toHaveAttribute(
      "href",
      "/profile/edit#cap_number",
    );
    expect(screen.queryByText("Email")).not.toBeInTheDocument();
  });

  it("supports a non-player profile without demanding a cap number", () => {
    render(
      <ProfileReadiness
        completed={2}
        items={[
          {
            label: "Foto",
            complete: true,
            icon: Camera,
            href: "/profile/edit#photo",
          },
          {
            label: "Teléfono",
            complete: true,
            icon: Phone,
            href: "/profile/edit#phone_e164",
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Perfil preparado" })).toBeInTheDocument();
    expect(screen.getByText("2/2")).toBeInTheDocument();
    expect(screen.queryByText("Gorro")).not.toBeInTheDocument();
  });
});
