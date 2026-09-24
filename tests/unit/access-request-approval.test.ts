import { describe, expect, it } from "vitest";
import { findUniqueExactProfile, requiresTemporaryPassword } from "@/lib/domain/access-onboarding";

describe("vinculación de cuentas", () => {
  const profiles = [
    { id: "ana", full_name: "Ana María Pérez" },
    { id: "luis", full_name: "Luis García" },
  ];

  it("encuentra un perfil existente aunque el nombre llegue sin tildes", () => {
    expect(findUniqueExactProfile(profiles, "  ANA   MARIA PEREZ ")?.id).toBe("ana");
  });

  it("no vincula un nombre ambiguo o inexistente", () => {
    expect(findUniqueExactProfile([...profiles, { id: "otra", full_name: "Ana Maria Perez" }], "Ana María Pérez")).toBeNull();
    expect(findUniqueExactProfile(profiles, "Carlos García")).toBeNull();
  });

  it("solo emite contraseña provisional cuando no hay una identidad de Google verificada", () => {
    expect(requiresTemporaryPassword(null)).toBe(true);
    expect(requiresTemporaryPassword("google-user-id")).toBe(false);
  });
});
