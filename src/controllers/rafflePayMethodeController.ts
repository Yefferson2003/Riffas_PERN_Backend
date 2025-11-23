import { Request, Response } from "express";
import RafflePayMethode from "../models/rafflePayMethode";
import PayMethode from "../models/payMethode";
import Raffle from "../models/raffle";
import { assignPayMethodToRaffleSchema } from "../middlewares/validateRafflePayMethod";

class RafflePayMethodeController {
    
    // Obtener métodos de pago de una rifa específica
    static async getRafflePayMethods(req: Request, res: Response) {
        try {
            const { raffleId } = req.params;
            
            const rafflePayMethods = await RafflePayMethode.findAll({
                where: { 
                    raffleId,
                    isActive: true 
                },
                include: [
                    {
                        model: PayMethode,
                        where: { isActive: true }
                    }
                ],
                order: [['createdAt', 'ASC']]
            });
            
            res.json(rafflePayMethods);
        } catch (error) {
            console.error('Error obteniendo métodos de pago de la rifa:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    // Obtener todos los métodos de pago de una rifa (incluidos inactivos) - Solo admin
    static async getAllRafflePayMethods(req: Request, res: Response) {
        try {
            const { raffleId } = req.params;
            
            const rafflePayMethods = await RafflePayMethode.findAll({
                where: { raffleId },
                include: [
                    {
                        model: PayMethode,
                        // attributes: ['id', 'name', 'isActive']
                    }
                ],
                order: [['createdAt', 'ASC']]
            });
            
            res.json(rafflePayMethods);
        } catch (error) {
            console.error('Error obteniendo todos los métodos de pago de la rifa:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    // Asignar método de pago a una rifa
    static async assignPayMethodToRaffle(req: Request, res: Response) {
        try {

            const parsed = assignPayMethodToRaffleSchema.safeParse(req.body);

            if (!parsed.success) {
                res.status(400).json({
                    error: 'Datos inválidos',
                    issues: parsed.error.issues
                });
                return;
            }

            const { 
                payMethodeId, 
                accountNumber, 
                accountHolder, 
                bankName, 
            } = parsed.data;
            
            // Verificar si ya existe esta asignación
            const existingAssignment = await RafflePayMethode.findOne({
                where: { 
                    raffleId: req.raffle.id, 
                    payMethodeId 
                }
            });
            
            if (existingAssignment) {
                res.status(400).json({
                    error: 'Este método de pago ya está asignado a la rifa'
                });
                return
            }
            
            const newAssignment = await RafflePayMethode.create({
                raffleId: req.raffle.id,
                payMethodeId,
                accountNumber,
                accountHolder,
                bankName,
                isActive: true
            });
            

            
            res.status(201).send('Método de pago asignado a la rifa correctamente');
        } catch (error) {
            console.error('Error asignando método de pago a la rifa:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    // Actualizar método de pago asignado a una rifa
    static async updateRafflePayMethod(req: Request, res: Response) {
        try {
            const parsed = assignPayMethodToRaffleSchema.safeParse(req.body);

            if (!parsed.success) {
                res.status(400).json({
                    error: 'Datos inválidos',
                    issues: parsed.error.issues
                });
                return;
            }

            const { 
                payMethodeId, 
                accountNumber, 
                accountHolder, 
                bankName, 
            } = parsed.data;
            
            await req.rafflePayMethod.update({
                payMethodeId,
                accountNumber,
                accountHolder,
                bankName
            });
            
            res.send('Método de pago de la rifa actualizado correctamente');
        } catch (error) {
            console.error('Error actualizando método de pago de la rifa:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    // Estado método de pago de una rifa
    static async statusRafflePayMethod(req: Request, res: Response) {
        try {


            const payMethodName =  req.rafflePayMethod.dataValues.payMethode?.dataValues.name?.toLowerCase();

            // Validar que no sea 'efectivo' o 'apartado'
            if (payMethodName === 'efectivo' || payMethodName === 'apartado') {
                res.status(403).json({
                    error: 'No es posible desactivar o activar los métodos de pago "Efectivo" o "Apartado"'
                });
                return;
            }

            const currentStatus = req.rafflePayMethod.dataValues.isActive;

            await req.rafflePayMethod.update({ isActive: !currentStatus });
            res.send(`Método de pago ${currentStatus ? 'desactivado' : 'activado'} para esta rifa`);
        } catch (error) {
            console.error('Error desactivando método de pago de la rifa:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

}

export default RafflePayMethodeController;