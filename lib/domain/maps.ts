import { z } from "zod";

export const MAX_MAPS_URL_LENGTH = 2048;

export function isSafeMapsUrl(value: string | null | undefined): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.username === "" && url.password === "";
  } catch {
    return false;
  }
}

export const mapsUrlInputSchema = z
  .string()
  .trim()
  .max(MAX_MAPS_URL_LENGTH, "El enlace es demasiado largo.")
  .refine(
    (value) => value === "" || isSafeMapsUrl(value),
    "Pega un enlace seguro que empiece por https://.",
  );

export const optionalMapsUrlSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z
    .string()
    .trim()
    .max(MAX_MAPS_URL_LENGTH, "El enlace es demasiado largo.")
    .refine(isSafeMapsUrl, "Pega un enlace seguro que empiece por https://.")
    .nullable()
    .optional(),
);
