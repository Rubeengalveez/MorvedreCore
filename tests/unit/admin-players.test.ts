import { describe, expect, it } from "vitest";
import { matchesPlayerSearch, playerCategory, playerListHref } from "@/lib/domain/admin-players";
import {
  changedPlayerFields,
  playerEditorSchema,
  type PlayerEditorValues,
} from "@/lib/domain/player-editor";
import { updatePlayerSchema } from "@/lib/domain/admin-schemas";

const values: PlayerEditorValues = {
  full_name: "Pepe López",
  birth_year: "2012",
  team_id: "",
  cap_number: null,
  phone_e164: "",
  email_contact: "",
  school_enrolled: false,
  school_payment_paid: false,
};
describe("Directorio y ficha de jugadores", () => {
  it.each([
    [2010, 2025, "cadete"],
    [2011, 2025, "cadete"],
    [2010, 2026, "juvenil"],
    [2011, 2026, "cadete"],
  ])("deriva %s en la temporada que comienza en %s como %s", (birth, season, category) => {
    expect(playerCategory(birth, season, false)).toBe(category);
  });
  it("busca sin tildes y con palabras en distinto orden", () => {
    expect(matchesPlayerSearch("lopez alevin", ["Pepe López", "Alevín"])).toBe(true);
    expect(matchesPlayerSearch("  LÓPEZ   pepe ", ["Pepe Lopez"])).toBe(true);
    expect(matchesPlayerSearch("juvenil", ["Pepe López", "Alevín"])).toBe(false);
  });
  it("los comodines SQL son texto literal", () => {
    expect(matchesPlayerSearch("%", ["Pepe López"])).toBe(false);
    expect(matchesPlayerSearch("_", ["Pepe López"])).toBe(false);
  });
  it("deriva la categoría por edad y mantiene la excepción de Escuela", () => {
    expect(playerCategory(2012, 2025, false)).toBe("infantil");
    expect(playerCategory(2012, 2025, true)).toBe("escuela");
    expect(playerCategory(null, 2025, false)).toBeNull();
  });
  it("conserva búsqueda y filtros al pasar de página", () => {
    expect(
      playerListHref(
        { page: 1, query: "Pepe López", status: "inactive", teamId: "team", category: "alevin" },
        2,
      ),
    ).toContain("category=alevin&page=2");
  });
  it("una edición parcial no exige datos ocultos", () => {
    expect(updatePlayerSchema.safeParse({ full_name: "Pepe López" }).success).toBe(true);
    expect(updatePlayerSchema.safeParse({ photo_url: null }).success).toBe(true);
    expect(updatePlayerSchema.safeParse({}).success).toBe(false);
  });
  it("solo guarda los campos cambiados y normaliza el contacto", () => {
    expect(changedPlayerFields({ ...values, phone_e164: "612 345 678" }, values)).toEqual({
      phone_e164: "+34612345678",
    });
    expect(changedPlayerFields({ ...values, full_name: " Pepe López " }, values)).toEqual({});
  });
  it("marca año obligatorio y bloquea años futuros", () => {
    expect(playerEditorSchema.safeParse({ ...values, birth_year: "" }).success).toBe(false);
    expect(playerEditorSchema.safeParse({ ...values, birth_year: "2100" }).success).toBe(false);
  });
});
