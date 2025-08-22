import { z } from 'zod';
import { identificationTypeEnum } from '../models/raffle_numbers';


export const updateUserSchema = z.object({
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
        .min(1, "Teléfono obligatorio"),
    address: z
        .string()
        .min(5, "La dirección es obligatoria y debe tener al menos 5 caracteres")
        .max(100, "La dirección no debe exceder 100 caracteres"),
    email: z
        .string()
        .email("Debe proporcionar un correo electrónico válido")
})

export const updatePasswordUserSchema = z.object({
    
    password: z
        .string()
        .min(8, "La contraseña debe tener al menos 8 caracteres")
        .regex(/[A-Z]/, "La contraseña debe incluir al menos una letra mayúscula")
        .regex(/[a-z]/, "La contraseña debe incluir al menos una letra minúscula")
        .regex(/\d/, "La contraseña debe incluir al menos un número"),
    confirmPassword: z.string()
})
.refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
});

export const updateIsActiveUserSchema = z.object({
    userId: z
        .number()
        .min(1, "Id obligatorio")
})