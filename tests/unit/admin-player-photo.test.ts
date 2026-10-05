import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { File as NodeFile } from "node:buffer";
import sharp from "sharp";
import { savePlayerWithPhoto } from "@/server/actions/admin/player-editor";
const mocks = vi.hoisted(() => ({
  permission: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("@/server/actions/admin/_helpers", () => ({ requirePermission: mocks.permission }));
vi.mock("@/server/actions/admin/players", () => ({
  createPlayer: mocks.create,
  updatePlayer: mocks.update,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        upload: mocks.upload,
        remove: mocks.remove,
        getPublicUrl: () => ({ data: { publicUrl: "https://example.com/new-avatar.jpg" } }),
      }),
    },
  }),
}));
const id = "22222222-2222-4222-8222-222222222222";
function data() {
  const values = new Map<string, unknown>();
  const form = {
    get: (key: string) => values.get(key) ?? null,
    set: (key: string, value: unknown) => values.set(key, value),
  } as unknown as FormData;
  form.set("id", id);
  form.set("input", JSON.stringify({ full_name: "Pepe López" }));
  return form;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("File", NodeFile);
  mocks.permission.mockResolvedValue({ id });
  mocks.upload.mockResolvedValue({ error: null });
  mocks.remove.mockResolvedValue({ error: null });
  mocks.update.mockResolvedValue({ id });
});
afterEach(() => vi.unstubAllGlobals());
describe("Foto de la ficha", () => {
  it("una edición sin foto conserva la anterior", async () => {
    await savePlayerWithPhoto(data());
    expect(mocks.update).toHaveBeenCalledWith(id, { full_name: "Pepe López" });
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("valida el contenido real del archivo antes de subirlo", async () => {
    const form = data();
    form.set("photo", new File(["fake image"], "photo.jpg", { type: "image/jpeg" }));
    await expect(savePlayerWithPhoto(form)).rejects.toThrow("No pudimos preparar la foto");
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("normaliza la foto y limpia la nueva subida si falla el guardado", async () => {
    const bytes = await sharp({
      create: { width: 16, height: 16, channels: 3, background: "blue" },
    })
      .jpeg()
      .toBuffer();
    const form = data();
    form.set("photo", new File([new Uint8Array(bytes)], "photo.jpg", { type: "image/jpeg" }));
    mocks.update.mockRejectedValue(new Error("Error guardando la ficha"));
    await expect(savePlayerWithPhoto(form)).rejects.toThrow("Error guardando la ficha");
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(mocks.remove).toHaveBeenCalledWith([mocks.upload.mock.calls[0][0]]);
    expect(mocks.update).toHaveBeenCalledWith(id, {
      full_name: "Pepe López",
      photo_url: "https://example.com/new-avatar.jpg",
    });
  });
  it("quitar la foto no borra el archivo antes de guardar", async () => {
    const form = data();
    form.set("remove_photo", "true");
    await savePlayerWithPhoto(form);
    expect(mocks.update).toHaveBeenCalledWith(id, { full_name: "Pepe López", photo_url: null });
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
