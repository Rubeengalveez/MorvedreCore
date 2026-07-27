import { render, screen } from "@testing-library/react";
import { Camera, Hash, Phone } from "lucide-react";
import { describe, expect, it } from "vitest";

import { ProfileReadiness } from "@/components/profile/profile-hub";

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
