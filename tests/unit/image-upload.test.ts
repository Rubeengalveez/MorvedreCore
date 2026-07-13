import { describe, expect, it } from "vitest";

import { validateImageFile } from "@/lib/uploads/images";

describe("validateImageFile", () => {
  it("accepts a PNG with a valid signature", async () => {
    const file = new File(
      [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])],
      "escudo.png",
      { type: "image/png" },
    );

    await expect(validateImageFile(file)).resolves.toEqual({
      contentType: "image/png",
      extension: "png",
    });
  });

  it("rejects content whose signature does not match its MIME type", async () => {
    const file = new File(["<script>alert(1)</script>"], "foto.jpg", {
      type: "image/jpeg",
    });

    await expect(validateImageFile(file)).rejects.toThrow("no coincide");
  });

  it("rejects unsupported image formats", async () => {
    const file = new File(["<svg></svg>"], "foto.svg", { type: "image/svg+xml" });

    await expect(validateImageFile(file)).rejects.toThrow("JPEG, PNG o WebP");
  });
});
