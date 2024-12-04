import { NextFunction, Request, Response } from "express";
import { z } from 'zod';
import RaffleNumbers, { identificationTypeEnum } from '../models/raffle_numbers';

export const createRifaSchema = z.object({
    name: z
        .string()
        .min(3, { message: "El nombre debe tener al menos 3 caracteres." })
        .max(100, { message: "El nombre no debe superar los 100 caracteres." }),
    nitResponsable: z
        .string()
        .min(3, { message: "El nit del responsable debe tener al menos 3 caracteres." })
        .max(100, { message: "El nit del responsable no debe superar los 100 caracteres." }),
    nameResponsable: z
        .string()
        .min(3, { message: "El nombre del responsable debe tener al menos 3 caracteres." })
        .max(100, { message: "El nombre del responsable no debe superar los 100 caracteres." }),
    description: z
        .string()
        .min(10, { message: "La descripción debe tener al menos 10 caracteres." })
        .max(500, { message: "La descripción no debe superar los 500 caracteres." }),
    startDate: z
        .string()
        .refine((val) => !isNaN(new Date(val).getTime()), {
            message: "La fecha de inicio debe ser una fecha válida.",
        }),
    playDate: z
        .string()
        .refine((val) => !isNaN(new Date(val).getTime()), {
            message: "La fecha de juego debe ser una fecha válida.",
        }),
    price: z
        .number()
        .positive({ message: "El precio debe ser un valor positivo." })
        .max(1000000000, { message: "El precio no puede superar $9,999.999.999 COP." }),
    quantity: z
        .number()
        .int({ message: "La cantidad debe ser un número entero." })
        .min(1, { message: "La cantidad debe ser al menos 1." })
        .default(1000),
}).
refine((data) => {
    const startDate = new Date(data.startDate);
    const playDateValue = new Date(data.playDate);
    return playDateValue > startDate;
},
{   
    message: "La fecha de juego debe ser posterior a la fecha de inicio.",
    path: ["playDate"],
});

export const updateRifaSchema = z.object({
    name: z
        .string()
        .min(3, { message: "El nombre debe tener al menos 3 caracteres." })
        .max(100, { message: "El nombre no debe superar los 100 caracteres." }),
    description: z
        .string()
        .min(10, { message: "La descripción debe tener al menos 10 caracteres." })
        .max(500, { message: "La descripción no debe superar los 500 caracteres." }),
    nitResponsable: z
        .string()
        .min(3, { message: "El nit del responsable debe tener al menos 3 caracteres." })
        .max(100, { message: "El nit del responsable no debe superar los 100 caracteres." }),
    nameResponsable: z
        .string()
        .min(3, { message: "El nombre del responsable debe tener al menos 3 caracteres." })
        .max(100, { message: "El nombre del responsable no debe superar los 100 caracteres." }),
    startDate: z
        .string()
        .refine((val) => !isNaN(new Date(val).getTime()), {
            message: "La fecha de inicio debe ser una fecha válida.",
        }),
    playDate: z
        .string()
        .refine((val) => !isNaN(new Date(val).getTime()), {
            message: "La fecha de juego debe ser una fecha válida.",
        }),
})

export const sellRaffleNumbersSchema = z.object({
    raffleNumbersIds : z.array(z.number().int().positive()),
    firstName: z
        .string()
        .min(1, "El nombre es obligatorio")
        .max(50, "El nombre no debe exceder 50 caracteres"),
    lastName: z
        .string()
        .min(1, "El apellido es obligatorio")
        .max(50, "El apellido no debe exceder 50 caracteres"),
    identificationType: z.enum(identificationTypeEnum, {
        required_error: "El tipo de identificación es obligatorio",
    }),
    identificationNumber: z
        .string()
        .regex(/^\d+$/, "El número de identificación debe contener solo dígitos")
        .min(6, "El número de identificación debe tener al menos 6 dígitos")
        .max(20, "El número de identificación no debe exceder 20 dígitos"),
    phone: z
        .string()
        .regex(/^\d{10}$/, "El teléfono debe ser un número válido de 10 dígitos"),
    address: z
        .string()
        .min(5, "La dirección es obligatoria y debe tener al menos 5 caracteres")
        .max(100, "La dirección no debe exceder 100 caracteres")
})

export const amountRaffleNumberSchema = z.object({
    firstName: z
        .string()
        .min(1, "El nombre es obligatorio")
        .max(50, "El nombre no debe exceder 50 caracteres"),
    lastName: z
        .string()
        .min(1, "El apellido es obligatorio")
        .max(50, "El apellido no debe exceder 50 caracteres"),
    identificationType: z.enum(identificationTypeEnum, {
        required_error: "El tipo de identificación es obligatorio",
    }),
    identificationNumber: z
        .string()
        .regex(/^\d+$/, "El número de identificación debe contener solo dígitos")
        .min(6, "El número de identificación debe tener al menos 6 dígitos")
        .max(20, "El número de identificación no debe exceder 20 dígitos"),
    phone: z
        .string()
        .regex(/^\d{10}$/, "El teléfono debe ser un número válido de 10 dígitos"),
    address: z
        .string()
        .min(5, "La dirección es obligatoria y debe tener al menos 5 caracteres")
        .max(100, "La dirección no debe exceder 100 caracteres"),
    amount : z
        .number()
        .int({ message: 'El valor debe ser un número entero.' }) // Asegura que sea entero
        .gt(0, { message: 'El valor debe ser mayor que 0.' }),
})

export const validateRaffleNumbersStatus = async (req: Request, res: Response, next: NextFunction) => {
    const { raffleNumbersIds } = req.body as { raffleNumbersIds: number[] };
    try {

        const matchingCount = await RaffleNumbers.count({
            where: {
                id: raffleNumbersIds,
                status: 'available',
                raffleId: req.raffle.id
            }
        })

        if (matchingCount < raffleNumbersIds.length) {
            const error = new Error('Algunos números no están disponibles para la venta.');
            res.status(400).json({error: error.message});
            return
        }

        next();
    } catch (error) {
        console.error('Error al validar números de rifa:', error);
        res.status(500).json({ error: 'Hubo un error al validar los números de rifa' });
    }
};

export const updateRaffleNumber = z.object({
    phone: z
        .string()
        .regex(/^\d{10}$/, "El teléfono debe ser un número válido de 10 dígitos"),
    address: z
        .string()
        .min(5, "La dirección es obligatoria y debe tener al menos 5 caracteres")
        .max(100, "La dirección no debe exceder 100 caracteres"),
})

