import { z } from "zod";

export const accountPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(10, "Mínimo 10 caracteres.")
      .regex(/^(?=.*[A-Za-z])(?=.*\d).{10,}$/, "Incluye al menos una letra y un número."),
    confirmPassword: z.string().min(1, "Repite la contraseña."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });
