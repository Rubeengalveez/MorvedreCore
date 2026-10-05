import { beforeEach, expect, it, vi } from "vitest";
import { accountPasswordSchema } from "@/lib/domain/account-password";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  change: vi.fn(),
  read: vi.fn(),
  save: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.auth, updateUser: mocks.change } }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        update: () => builder,
        ilike: () => builder,
        maybeSingle: mocks.save,
      };
      return { select: () => ({ eq: () => ({ maybeSingle: mocks.read }) }), update: () => builder };
    },
  }),
}));
vi.mock("@/lib/email/resend", () => ({ sendAdminAccessRequestNotification: vi.fn() }));
import { updatePassword } from "@/server/actions/auth";
function data(returnTo = "/profile/settings") {
  const form = new FormData();
  form.set("newPassword", "test-pass-12345");
  form.set("confirmPassword", "test-pass-12345");
  form.set("returnTo", returnTo);
  return form;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ data: { user: { id: "auth-own" } }, error: null });
  mocks.change.mockResolvedValue({ error: null });
  mocks.read.mockResolvedValue({
    data: { id: "own", is_active: true, must_change_password: false },
    error: null,
  });
  mocks.save.mockResolvedValue({ data: { id: "own" }, error: null });
});
it("comparte las mismas reglas de contraseña entre cliente y servidor", () => {
  expect(
    accountPasswordSchema.safeParse({ newPassword: "abcdefghij", confirmPassword: "abcdefghij" })
      .success,
  ).toBe(false);
  expect(
    accountPasswordSchema.safeParse({ newPassword: "test-pass-12345", confirmPassword: "mismatch" })
      .success,
  ).toBe(false);
});
it("regresa a la cuenta después del cambio y rechaza destinos externos", async () => {
  await updatePassword(null, data());
  expect(mocks.redirect).toHaveBeenLastCalledWith("/profile/settings");
  await updatePassword(null, data("https://bad.example"));
  expect(mocks.redirect).toHaveBeenLastCalledWith("/dashboard");
});
it("la activación no se puede saltar mediante el destino de un formulario", async () => {
  mocks.read.mockResolvedValue({
    data: { id: "own", is_active: true, must_change_password: true },
    error: null,
  });
  await updatePassword(null, data());
  expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
});
it("no permite cambiar credenciales de una cuenta desactivada", async () => {
  mocks.read.mockResolvedValue({ data: { id: "own", is_active: false }, error: null });
  expect((await updatePassword(null, data()))?.error).toMatch(/activa/);
  expect(mocks.change).not.toHaveBeenCalled();
});
it("no declara éxito si falla la actualización del proveedor de autenticación", async () => {
  mocks.change.mockResolvedValue({ error: { message: "requires recent login" } });
  expect((await updatePassword(null, data()))?.error).toMatch(/cambiar la contraseña/);
  expect(mocks.redirect).not.toHaveBeenCalled();
});
