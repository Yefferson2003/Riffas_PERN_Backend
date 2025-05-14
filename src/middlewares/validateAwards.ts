import z from "zod";

export const awardSchema = z.object({
    name: z
        .string()
        .min(1, "Descripción es obligatoria"),
    playDate: z
        .string()
        .min(1, "La fecha es obligatoria")
})