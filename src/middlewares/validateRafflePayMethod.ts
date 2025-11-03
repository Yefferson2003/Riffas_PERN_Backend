import { z } from "zod";

export const assignPayMethodToRaffleSchema = z.object({
    payMethodeId: z.number()
        .int('El ID del método de pago debe ser un número entero')
        .positive('El ID del método de pago debe ser positivo'),
    accountNumber: z.string()
        // .min(1, 'El número de cuenta es obligatorio')
        .max(50, 'El número de cuenta no puede tener más de 50 caracteres')
        .optional(),
    accountHolder: z.string()
        // .min(1, 'El titular de la cuenta es obligatorio')
        .max(100, 'El titular de la cuenta no puede tener más de 100 caracteres')
        .optional(),
    // type: z.enum(['bank_transfer', 'digital_wallet', 'cash', 'card', 'crypto'])
    //     .optional(),
    bankName: z.string()
        .max(100, 'El nombre del banco no puede tener más de 100 caracteres')
        .optional(),
    // instructions: z.string()
    //     .max(1000, 'Las instrucciones no pueden tener más de 1000 caracteres')
    //     .optional(),
    // fee: z.number()
    //     .min(0, 'La comisión no puede ser negativa')
    //     .max(100, 'La comisión no puede ser mayor al 100%')
    //     .optional()
    //     .default(0),
    // order: z.number()
    //     .int('El orden debe ser un número entero')
    //     .min(0, 'El orden no puede ser negativo')
    //     .optional()
    //     .default(0)
});

// export const updateRafflePayMethodSchema = z.object({
//     accountNumber: z.string()
//         .min(1, 'El número de cuenta es obligatorio')
//         .max(50, 'El número de cuenta no puede tener más de 50 caracteres')
//         .optional(),
//     accountHolder: z.string()
//         .min(1, 'El titular de la cuenta es obligatorio')
//         .max(100, 'El titular de la cuenta no puede tener más de 100 caracteres')
//         .optional(),
//     type: z.enum(['bank_transfer', 'digital_wallet', 'cash', 'card', 'crypto'])
//         .optional(),
//     bankName: z.string()
//         .max(100, 'El nombre del banco no puede tener más de 100 caracteres')
//         .optional(),
//     instructions: z.string()
//         .max(1000, 'Las instrucciones no pueden tener más de 1000 caracteres')
//         .optional(),
//     fee: z.number()
//         .min(0, 'La comisión no puede ser negativa')
//         .max(100, 'La comisión no puede ser mayor al 100%')
//         .optional(),
//     order: z.number()
//         .int('El orden debe ser un número entero')
//         .min(0, 'El orden no puede ser negativo')
//         .optional(),
//     isActive: z.boolean()
//         .optional()
// });

// export const updatePayMethodsOrderSchema = z.object({
//     payMethodsOrder: z.array(z.object({
//         id: z.number()
//             .int('El ID debe ser un número entero')
//             .positive('El ID debe ser positivo'),
//         order: z.number()
//             .int('El orden debe ser un número entero')
//             .min(0, 'El orden no puede ser negativo')
//     }))
//     .min(1, 'Debe proporcionar al menos un método de pago para ordenar')
// });

export type AssignPayMethodToRaffleType = z.infer<typeof assignPayMethodToRaffleSchema>;
// export type UpdateRafflePayMethodType = z.infer<typeof updateRafflePayMethodSchema>;
// export type UpdatePayMethodsOrderType = z.infer<typeof updatePayMethodsOrderSchema>;