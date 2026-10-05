import { z } from "zod";
import { normalizeSpanishPhone } from "./phone";

export const playerEditorSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, "Escribe el nombre completo.")
      .max(100, "El nombre admite hasta 100 caracteres."),
    birth_year: z.string().regex(/^\d{4}$/, "Escribe el año de nacimiento con cuatro cifras."),
    team_id: z.string(),
    cap_number: z.number().int().min(1).max(14).nullable(),
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
    school_enrolled: z.boolean(),
    school_payment_paid: z.boolean(),
  })
  .superRefine((values, context) => {
    const year = Number(values.birth_year);
    if (year < 1900 || year > new Date().getFullYear())
      context.addIssue({
        code: "custom",
        path: ["birth_year"],
        message: "El año no puede ser futuro ni anterior a 1900.",
      });
  });

export type PlayerEditorValues = z.infer<typeof playerEditorSchema>;

export function playerEditorPayload(values: PlayerEditorValues) {
  return {
    full_name: values.full_name.trim(),
    birth_year: Number(values.birth_year),
    cap_number: values.cap_number,
    phone_e164: normalizeSpanishPhone(values.phone_e164),
    email_contact: values.email_contact.trim() || null,
    school_enrolled: values.school_enrolled,
    school_payment_paid: values.school_enrolled && values.school_payment_paid,
  };
}

export function changedPlayerFields(values: PlayerEditorValues, baseline: PlayerEditorValues) {
  const next = playerEditorPayload(values);
  const previous = playerEditorPayload(baseline);
  return Object.fromEntries(
    Object.entries(next).filter(([key, value]) => value !== previous[key as keyof typeof previous]),
  );
}
