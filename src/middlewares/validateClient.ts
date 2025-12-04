import z from "zod";
import { Response, Request, NextFunction } from "express";
import UserClients from "../models/user_clients";


export const clientSchema = z.object({
    firstName: z
        .string()
        .min(1, "El nombre es obligatorio")
        .max(50, "El nombre no debe exceder 50 caracteres"),
    lastName: z
        .string()
        .min(1, "El apellido es obligatorio")
        .max(50, "El apellido no debe exceder 50 caracteres"),
    phone: z
        .string()
        .min(1, "Teléfono obligatorio"),
    address: z
        .string()
        .min(5, "La dirección es obligatoria y debe tener al menos 5 caracteres")
        .max(100, "La dirección no debe exceder 100 caracteres"),
})

export const buyNumbersForClientSchema = z.object({
    numbers: z
        .array(z.string().regex(/^\d+$/, "Cada número debe ser un string que representa un número entero positivo"))
        .min(1, 'Debes seleccionar al menos un número'),
    raffleId: z
        .number()
        .int('El ID de la rifa debe ser un número entero'),
    // option: z.enum(['comprar', 'apartar'], {
    //     errorMap: () => ({ message: 'La opción debe ser "comprar" o "apartar"' })
    // })
});

/**
 * Middleware userClientExist
 *
 * Requisitos para funcionar correctamente en una ruta:
 * 1. El usuario debe estar autenticado (req.user debe existir y tener id).
 * 2. El cliente debe estar cargado en req.client (usualmente por un middleware previo).
 *
 * Ejemplo de uso en una ruta:
 * router.put('/clientes/:id', authenticate, getClientById, userClientExist, updateClient)
 *
 * Donde:
 * - authenticate: middleware que valida y carga req.user
 * - getClientById: middleware que busca el cliente y lo pone en req.client
 * - userClientExist: valida que el usuario tenga relación con el cliente
 * - updateClient: controlador que actualiza el cliente
 */
export const userClientExist = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userClient = await UserClients.findOne({
            where: {
                userId: req.user.id,
                clientId: req.client.id
            }
        });

        if (!userClient) {
            res.status(403).json({ error: 'No tienes permiso para modificar este cliente' });
            return;
        }
        next();
    } catch (error) {
        res.status(500).json({error: 'Hubo un Error - validateClient'})
    }
}