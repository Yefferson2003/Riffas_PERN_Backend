import z from "zod";

export const whatsappSendRaffleSummarySchema = z.object({
    to: z.string().min(10, "El número de destino es obligatorio y debe tener al menos 10 dígitos"),
    imageUrl: z.string().url("La URL de la imagen no es válida"),
    name: z.string().min(1, "El nombre es obligatorio"),
    actionMessage: z.string().min(1, "El mensaje de acción es obligatorio"),
    raffleName: z.string().min(1, "El nombre de la rifa es obligatorio"),
    numbers: z.string().min(1, "Los números son obligatorios"),
    price: z.string().min(1, "El precio es obligatorio"),
    debt: z.string().min(1, "La deuda es obligatoria"),
    playDate: z.string().min(1, "La fecha de juego es obligatoria"),
});

