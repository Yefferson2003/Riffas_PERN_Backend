import z from "zod";

const monedaSchema = {
    id: z.number(),
    name: z.string().min(1, 'El nombre de la moneda es requerido'),
}

export const createMonedaSchema = z.object({
    name: monedaSchema.name,
});

export const updateMonedaSchema = z.object({
    name: monedaSchema.name.optional(),
});

const tasaSchema = {
    value: z.number().positive('El valor de la tasa debe ser un número positivo'),
}

export const createTasaSchema = z.object({
    value: tasaSchema.value,
});

export const updateTasaSchema = z.object({
    value: tasaSchema.value.optional(),
});



