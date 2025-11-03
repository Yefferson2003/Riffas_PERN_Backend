import { z } from "zod";

export const payMethodSchema = z.object({
    name: z.string()
        .min(1, 'El nombre es obligatorio')
        .max(50, 'El nombre no puede tener más de 50 caracteres')
        .transform((name) => name.toLowerCase().trim()),
    // icon: z.string()
    //     .url('Debe ser una URL válida')
    //     .optional(),
    // isActive: z.boolean()
    //     .optional()
    //     .default(true)
});

// export const updatePayMethodSchema = z.object({
//     name: z.string()
//         .min(1, 'El nombre es obligatorio')
//         .max(50, 'El nombre no puede tener más de 50 caracteres')
//         .optional(),
//     icon: z.string()
//         .url('Debe ser una URL válida')
//         .optional(),
//     isActive: z.boolean()
//         .optional()
// });

// export type CreatePayMethodType = z.infer<typeof createPayMethodSchema>;
export type UpdatePayMethodType = z.infer<typeof payMethodSchema>;