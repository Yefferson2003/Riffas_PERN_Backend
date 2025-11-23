import { z } from "zod";

export const createRaffleOfferSchema = z.object({
    minQuantity: z.number({
        required_error: 'La cantidad mínima es requerida',
        invalid_type_error: 'La cantidad mínima debe ser un número'
    }).int('La cantidad mínima debe ser un número entero')
    .positive('La cantidad mínima debe ser mayor a 0'),
    
    discountedPrice: z.number({
        required_error: 'El precio con descuento es requerido',
        invalid_type_error: 'El precio con descuento debe ser un número'
    }).positive('El precio con descuento debe ser mayor a 0')
});

export type CreateRaffleOfferType = z.infer<typeof createRaffleOfferSchema>;
