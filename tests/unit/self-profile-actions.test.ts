import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { File as NodeFile } from "node:buffer";
import sharp from "sharp";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  read: vi.fn(),
  save: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  roles: vi.fn(),
  payload: vi.fn(),
  filters: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.auth },
    from: () => ({ select: () => ({ eq: mocks.roles }) }),
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.read }) }),
      update: (payload: unknown) => {
        mocks.payload(payload);
        const builder = {
          eq: (...args: unknown[]) => {
            mocks.filters(...args);
            return builder;
          },
          select: () => ({ maybeSingle: mocks.save }),
        };
        return builder;
      },
    }),
    storage: {
      from: () => ({
        upload: mocks.upload,
        remove: mocks.remove,
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://storage.test/storage/v1/object/public/avatars/${path}` },
        }),
      }),
    },
  }),
}));
import { updateProfile } from "@/server/actions/profile";
const revision = "2026-10-03T10:00:00+00:00";
const oldUrl = "https://storage.test/storage/v1/object/public/avatars/own/avatar.jpg";
function data() {
  const entries = new Map<string, unknown>();
  const form = {
    get: (key: string) => entries.get(key) ?? null,
    set: (key: string, value: unknown) => entries.set(key, value),
    has: (key: string) => entries.has(key),
    delete: (key: string) => entries.delete(key),
  } as unknown as FormData;
  form.set("full_name", "Pepe López");
  form.set("phone_e164", "612 345 678");
  form.set("email_contact", "pepe@example.test");
  form.set("cap_number", "9");
  form.set("updated_at", revision);
  return form;
}
async function photo(form: FormData) {
  const bytes = await sharp({ create: { width: 16, height: 16, channels: 3, background: "blue" } })
    .jpeg()
    .toBuffer();
  form.set("avatar_file", new File([new Uint8Array(bytes)], "photo.jpg", { type: "image/jpeg" }));
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("File", NodeFile);
  mocks.auth.mockResolvedValue({ data: { user: { id: "auth-own" } }, error: null });
  mocks.read.mockResolvedValue({
    data: { id: "own", birth_year: 2014, photo_url: oldUrl, updated_at: revision, is_active: true },
    error: null,
  });
  mocks.roles.mockResolvedValue({ data: [{ role: "player" }], error: null });
  mocks.save.mockResolvedValue({ data: { id: "own" }, error: null });
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
});
afterEach(() => vi.unstubAllGlobals());
describe("Guardado de datos propios", () => {
  it("solo persiste datos permitidos y siempre limita la fila a la cuenta autenticada", async () => {
    const form = data();
    form.set("id", "other");
    form.set("roles", "admin");
    form.set("is_active", "true");
    expect(await updateProfile(null, form)).toEqual({ ok: true });
    expect(mocks.payload).toHaveBeenCalledWith({
      full_name: "Pepe López",
      phone_e164: "+34612345678",
      email_contact: "pepe@example.test",
      cap_number: 9,
    });
    expect(mocks.filters).toHaveBeenCalledWith("auth_user_id", "auth-own");
    expect(mocks.filters).toHaveBeenCalledWith("updated_at", revision);
  });
  it("impide alterar la edad para eludir las reglas de menores", async () => {
    const form = data();
    form.set("birth_year", "2000");
    expect((await updateProfile(null, form))?.error).toMatch(/año de nacimiento/);
    expect(mocks.payload).not.toHaveBeenCalled();
  });
  it("rechaza sesiones ausentes y fichas desactivadas", async () => {
    mocks.auth.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect((await updateProfile(null, data()))?.error).toMatch(/sesión/);
    mocks.read.mockResolvedValueOnce({ data: { id: "own", is_active: false }, error: null });
    expect((await updateProfile(null, data()))?.error).toMatch(/activo/);
    expect(mocks.payload).not.toHaveBeenCalled();
  });
  it("un perfil no jugador no puede modificar un gorro", async () => {
    mocks.roles.mockResolvedValue({ data: [{ role: "parent" }], error: null });
    expect((await updateProfile(null, data()))?.error).toMatch(/jugador/);
    const form = data();
    form.delete("cap_number");
    expect(await updateProfile(null, form)).toEqual({ ok: true });
    expect(mocks.payload.mock.calls[0][0]).not.toHaveProperty("cap_number");
  });
  it("evita sobrescribir una edición concurrente", async () => {
    const form = data();
    form.set("updated_at", "2026-10-02T10:00:00+00:00");
    expect((await updateProfile(null, form))?.error).toMatch(/otra sesión/);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
    mocks.save.mockResolvedValue({ data: null, error: null });
    expect((await updateProfile(null, data()))?.error).toMatch(/otra sesión/);
  });
  it("conserva la foto anterior y limpia la subida nueva si la escritura falla", async () => {
    const form = data();
    await photo(form);
    mocks.save.mockRejectedValue(new Error("network"));
    expect((await updateProfile(null, form))?.error).toMatch(/anterior se conserva/);
    expect(mocks.upload.mock.calls[0][0]).not.toBe("own/avatar.jpg");
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith([mocks.upload.mock.calls[0][0]]);
  });
  it("no borra una foto si falla guardar su eliminación", async () => {
    const form = data();
    form.set("remove_photo", "true");
    mocks.save.mockResolvedValue({ data: null, error: { message: "failed" } });
    expect((await updateProfile(null, form))?.error).toBeTruthy();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("borra la anterior solo después de guardar la nueva", async () => {
    const form = data();
    await photo(form);
    expect(await updateProfile(null, form)).toEqual({ ok: true });
    expect(mocks.remove).toHaveBeenCalledWith(["own/avatar.jpg"]);
    expect(mocks.save.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.remove.mock.invocationCallOrder[0]!,
    );
  });
  it("no elimina archivos de otro perfil aunque su URL esté en la ficha", async () => {
    mocks.read.mockResolvedValue({
      data: {
        id: "own",
        birth_year: 2014,
        photo_url: oldUrl.replace("own/", "other/"),
        updated_at: revision,
        is_active: true,
      },
      error: null,
    });
    const form = data();
    form.set("remove_photo", "true");
    expect(await updateProfile(null, form)).toEqual({ ok: true });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("comprueba el contenido real del archivo antes de subirlo", async () => {
    const form = data();
    form.set("avatar_file", new File(["not an image"], "photo.jpg", { type: "image/jpeg" }));
    expect((await updateProfile(null, form))?.error).toMatch(/JPG o PNG/);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.save).not.toHaveBeenCalled();
  });
});

it("una respuesta perdida no borra una foto cuyo guardado sí llegó a completarse", async () => {
  const form = data();
  await photo(form);
  mocks.save.mockImplementation(async () => {
    mocks.read.mockResolvedValue({
      data: {
        photo_url: `https://storage.test/storage/v1/object/public/avatars/${mocks.upload.mock.calls[0][0]}`,
      },
      error: null,
    });
    throw new Error("lost response");
  });
  expect(await updateProfile(null, form)).toEqual({ ok: true });
  expect(mocks.remove).not.toHaveBeenCalledWith([mocks.upload.mock.calls[0][0]]);
});
it("una conexión caída impide eliminar una subida cuyo guardado no se puede verificar", async () => {
  const form = data();
  await photo(form);
  mocks.save.mockImplementation(async () => {
    mocks.read.mockRejectedValue(new Error("offline"));
    throw new Error("lost response");
  });
  expect((await updateProfile(null, form))?.error).toMatch(/confirmar el guardado/);
  expect(mocks.remove).not.toHaveBeenCalled();
});
