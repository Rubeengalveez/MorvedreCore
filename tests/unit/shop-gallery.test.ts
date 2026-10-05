import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateShopProduct } from "@/server/actions/admin/shop";

const state = vi.hoisted(() => ({
  images: [] as Array<{ id: string; url: string; storage_path: string | null }>,
  permission: vi.fn().mockResolvedValue(undefined),
  upload: vi.fn().mockResolvedValue({ error: null }),
  remove: vi.fn().mockResolvedValue({ error: null }),
  rpc: vi.fn().mockResolvedValue({ error: null }),
  update: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/shop-email", () => ({ notifyShopOrder: vi.fn() }));
vi.mock("@/server/actions/admin/notification-dispatch", () => ({
  insertNotificationsWithPush: vi.fn(),
}));
vi.mock("@/server/actions/admin/_helpers", () => ({
  requirePermission: state.permission,
  requireSessionProfile: vi.fn(),
}));
vi.mock("@/lib/uploads/images", () => ({
  validateImageFile: vi.fn().mockResolvedValue({ contentType: "image/jpeg", extension: "jpg" }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        update: (value: unknown) => {
          state.update(value);
          return query;
        },
        single: async () => ({
          data: { image_url: "https://example.com/legacy.jpg" },
          error: null,
        }),
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({
            data: table === "shop_product_images" ? state.images : null,
            error: null,
          }).then(resolve),
      };
      return query;
    },
    rpc: state.rpc,
    storage: {
      from: () => ({
        upload: state.upload,
        remove: state.remove,
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://example.com/${path}` } }),
      }),
    },
  }),
}));
const product = "11111111-1111-4111-8111-111111111111",
  a = "22222222-2222-4222-8222-222222222222",
  b = "33333333-3333-4333-8333-333333333333";
const input = {
  product_id: product,
  title: "Camiseta azul",
  description: "Con escudo",
  category: "Camisetas",
  price_eur: 10,
};
beforeEach(() => {
  vi.clearAllMocks();
  state.permission.mockResolvedValue(undefined);
  state.rpc.mockResolvedValue({ error: null });
  state.images = [
    { id: a, url: "https://example.com/a.jpg", storage_path: "shop/a.jpg" },
    { id: b, url: "https://example.com/b.jpg", storage_path: "shop/b.jpg" },
  ];
});
describe("Conservación de la galería", () => {
  it("añade una foto sin borrar las anteriores y cambia la portada por orden", async () => {
    await updateShopProduct({
      ...input,
      imageFiles: [new File(["photo"], "c.jpg")],
      galleryOrder: [{ fileIndex: 0 }, { imageId: a }, { imageId: b }],
    });
    const rows = state.rpc.mock.calls[0][1].p_images;
    expect(rows.map((image: { url: string }) => image.url)).toEqual([
      expect.stringContaining("shop/"),
      "https://example.com/a.jpg",
      "https://example.com/b.jpg",
    ]);
    expect(rows.map((image: { is_cover: boolean }) => image.is_cover)).toEqual([
      true,
      false,
      false,
    ]);
    expect(state.remove).not.toHaveBeenCalled();
  });
  it("reordena existentes sin subir fotos", async () => {
    await updateShopProduct({ ...input, galleryOrder: [{ imageId: b }, { imageId: a }] });
    expect(state.upload).not.toHaveBeenCalled();
    expect(state.rpc.mock.calls[0][1].p_images[0].url).toBe("https://example.com/b.jpg");
    expect(state.update).toHaveBeenCalledWith(
      expect.objectContaining({ image_url: "https://example.com/b.jpg" }),
    );
  });
  it("quita la última foto y su portada", async () => {
    await updateShopProduct({ ...input, galleryOrder: [] });
    expect(state.rpc.mock.calls[0][1].p_images).toEqual([]);
    expect(state.update).toHaveBeenCalledWith(expect.objectContaining({ image_url: null }));
    expect(state.remove).toHaveBeenCalledWith(["shop/a.jpg", "shop/b.jpg"]);
  });
  it("un fallo conserva las anteriores y limpia solo la subida nueva", async () => {
    state.rpc.mockResolvedValue({ error: { message: "failure" } });
    await expect(
      updateShopProduct({
        ...input,
        imageFiles: [new File(["photo"], "c.jpg")],
        galleryOrder: [{ imageId: a }, { fileIndex: 0 }],
      }),
    ).rejects.toThrow("anteriores se conservan");
    expect(state.remove).toHaveBeenCalledTimes(1);
    expect(state.remove.mock.calls[0][0]).not.toContain("shop/a.jpg");
    expect(state.remove.mock.calls[0][0]).not.toContain("shop/b.jpg");
    expect(state.update).not.toHaveBeenCalled();
  });
  it("rechaza fotos ajenas antes de subir y exige permiso", async () => {
    await expect(
      updateShopProduct({
        ...input,
        galleryOrder: [{ imageId: "44444444-4444-4444-8444-444444444444" }],
      }),
    ).rejects.toThrow("fotos han cambiado");
    expect(state.rpc).not.toHaveBeenCalled();
    state.permission.mockRejectedValue(new Error("Sin permiso"));
    await expect(updateShopProduct({ ...input, galleryOrder: [] })).rejects.toThrow("Sin permiso");
    expect(state.rpc).not.toHaveBeenCalled();
  });
});
