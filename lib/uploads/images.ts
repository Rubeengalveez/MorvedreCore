const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

function hasPrefix(bytes: Uint8Array, expected: number[]): boolean {
  return expected.every((value, index) => bytes[index] === value);
}

export async function validateImageFile(
  file: File,
): Promise<{ contentType: keyof typeof IMAGE_TYPES; extension: string }> {
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    throw new Error("La imagen debe ocupar entre 1 byte y 5 MB.");
  }

  if (!(file.type in IMAGE_TYPES)) {
    throw new Error("La imagen debe ser JPEG, PNG o WebP.");
  }

  const contentType = file.type as keyof typeof IMAGE_TYPES;
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const valid =
    (contentType === "image/jpeg" && hasPrefix(bytes, [0xff, 0xd8, 0xff])) ||
    (contentType === "image/png" &&
      hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    (contentType === "image/webp" &&
      hasPrefix(bytes, [0x52, 0x49, 0x46, 0x46]) &&
      hasPrefix(bytes.slice(8), [0x57, 0x45, 0x42, 0x50]));

  if (!valid) {
    throw new Error("El contenido del archivo no coincide con una imagen válida.");
  }

  return { contentType, extension: IMAGE_TYPES[contentType] };
}

export async function validateAvatarImageFile(file: File): Promise<void> {
  if (file.type !== "image/jpeg" && file.type !== "image/png") {
    throw new Error("La foto de perfil debe ser JPG o PNG.");
  }
  await validateImageFile(file);
}
