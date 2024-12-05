import { NextFunction, Request, Response } from 'express';
import { z, ZodSchema } from 'zod';
import { rolEnum } from '../models/rol';
import { identificationTypeEnum } from '../models/raffle_numbers';

//VALIDACIONES GENERICAS
const idSchema = z.string().min(1, "El ID no puede estar vacío").regex(/^\d+$/, "El ID debe ser un número válido");

export const validateIdParam = (paramName: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = idSchema.safeParse(req.params[paramName]);
        if (!result.success) {
            res.status(400).json({ errors: result.error.errors });
            return
        }
        next();
    };
};

export const validateSchema = (schema: ZodSchema, target: "body" | "query" | "params" = "body") =>
    (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
        // Extraer el primer mensaje de error
        const firstErrorMessage = result.error.errors[0].message;
        
        // Responder con un mensaje simple
        res.status(400).json({error: firstErrorMessage});
        return;
    }
    next();
};


//VALIDAR AUTH
export const createRolSchema = z.object({
    name: z.string().min(1, "El nombre es obligatorio"),
});

export const loginSchema = z.object({
    identificationNumber: z
        .string()
        .min(1, "el numero de identificacion es obligatoria"),
    password: z
        .string()
        .min(1, "La contraseña es obligatoria")
})

export const createUserSchema = z.object({
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
    email: z
        .string()
        .email("Debe proporcionar un correo electrónico válido"),
    password: z
        .string()
        .min(8, "La contraseña debe tener al menos 8 caracteres")
        .regex(/[A-Z]/, "La contraseña debe incluir al menos una letra mayúscula")
        .regex(/[a-z]/, "La contraseña debe incluir al menos una letra minúscula")
        .regex(/\d/, "La contraseña debe incluir al menos un número"),
    confirmPassword: z.string(),
    rolName: z.enum(rolEnum, {
        required_error: "El rol es obligatorio",
    }),
})
.refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"], // Apunta el error a este campo
});

