import { z } from "zod";
import { normalizeSpanishPhone } from "./phone";

export const selfProfileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Escribe tu nombre completo.")
    .max(100, "El nombre admite hasta 100 caracteres."),
  phone_e164: z
    .string()
    .trim()
    .refine(
      (value) => !value || normalizeSpanishPhone(value) != null,
      "Escribe un teléfono válido, por ejemplo 612 345 678.",
    ),
  email_contact: z
    .string()
    .trim()
    .pipe(z.union([z.literal(""), z.email("Revisa el correo electrónico.")])),
  cap_number: z.number().int().min(1).max(14).nullable(),
});

export type SelfProfileValues = z.infer<typeof selfProfileSchema>;

export function selfProfilePayload(values: SelfProfileValues) {
  return {
    full_name: values.full_name.trim(),
    phone_e164: normalizeSpanishPhone(values.phone_e164),
    email_contact: values.email_contact.trim() || null,
    cap_number: values.cap_number,
  };
}

export interface EditableSelfProfile {
  id: string;
  full_name: string;
  photo_url: string | null;
  birth_year: number | null;
  cap_number: number | null;
  phone_e164: string | null;
  email_contact: string | null;
  team_color: string | null;
  updated_at: string;
}
