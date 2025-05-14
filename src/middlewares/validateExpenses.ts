import z from "zod";

export const expenseSchema = z.object({
    name: z
        .string()
        .min(1, "Descripción es obligatoria"),
    amount: z
        .number()
        .min(1, "El monto debe ser mayor a 0")
})