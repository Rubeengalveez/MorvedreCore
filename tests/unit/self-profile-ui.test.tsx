import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ save: vi.fn(), push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock("@/components/profile/use-profile-back-guard", () => ({
  useProfileBackGuard: () => mocks.push,
}));
vi.mock("@/server/actions/profile", () => ({ updateProfile: mocks.save }));
vi.mock("@/components/profile/avatar-editor", () => ({
  AvatarEditor: () => <div>Foto de perfil</div>,
}));
import { ProfileForm } from "@/app/(app)/profile/profile-form";
const profile = {
  id: "own",
  full_name: "Pepe López",
  photo_url: null,
  birth_year: 2014,
  cap_number: 9,
  phone_e164: "+34612345678",
  email_contact: null,
  team_color: null,
  updated_at: "2026-10-03T10:00:00+00:00",
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.save.mockResolvedValue({ ok: true });
});
afterEach(cleanup);
function edit() {
  fireEvent.change(screen.getByLabelText("Nombre completo"), {
    target: { value: "Pepe López Torres" },
  });
}
describe("Edición propia", () => {
  it("mantiene el nacimiento bajo gestión del club y no exige un gorro a un tutor", () => {
    render(<ProfileForm profile={profile} isPlayer={false} loginEmail="pepe@example.test" />);
    expect(screen.getByText("2014")).toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Gorro preferido" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revisar y guardar" })).toBeDisabled();
  });
  it("revisa cambios, confirma una sola vez y vuelve al perfil tras guardar", async () => {
    render(<ProfileForm profile={profile} isPlayer />);
    edit();
    fireEvent.click(screen.getByRole("button", { name: "Revisar y guardar" }));
    expect(mocks.save).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveTextContent("Pepe López Torres");
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/profile"));
    const form = mocks.save.mock.calls[0][1] as FormData;
    expect(form.get("birth_year")).toBeNull();
    expect(form.get("updated_at")).toBe(profile.updated_at);
    expect(form.get("cap_number")).toBe("9");
    expect(mocks.save).toHaveBeenCalledOnce();
  });
  it("un fallo conserva los valores editados y no declara éxito", async () => {
    mocks.save.mockResolvedValue({ error: "No hay conexión." });
    render(<ProfileForm profile={profile} isPlayer />);
    edit();
    fireEvent.click(screen.getByRole("button", { name: "Revisar y guardar" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No hay conexión");
    expect(mocks.push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Volver a editar" }));
    expect(screen.getByLabelText("Nombre completo")).toHaveValue("Pepe López Torres");
  });
  it("permite cancelar una salida sin perder los cambios", () => {
    render(<ProfileForm profile={profile} isPlayer />);
    edit();
    fireEvent.click(screen.getByRole("button", { name: "Mi perfil" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("¿Salir sin guardar?");
    fireEvent.click(screen.getByRole("button", { name: "Seguir editando" }));
    expect(mocks.push).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Nombre completo")).toHaveValue("Pepe López Torres");
  });
  it("valida y enfoca el campo que necesita corrección", () => {
    render(<ProfileForm profile={profile} isPlayer />);
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: "Revisar y guardar" }));
    expect(screen.getByLabelText("Teléfono")).toHaveFocus();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
