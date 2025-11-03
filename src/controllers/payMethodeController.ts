import { Request, Response } from "express";
import PayMethode from "../models/payMethode";
import { payMethodSchema } from "../middlewares/validatePayMethod";

class PayMethodeController {
    
    // Obtener todos los métodos de pago
    static async getPayMethods(req: Request, res: Response) {
        try {
            const payMethods = await PayMethode.findAll({
                order: [['name', 'ASC']]
            });
            
            res.json(payMethods);
        } catch (error) {
            console.error('Error obteniendo métodos de pago:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    // Obtener métodos de pago activos
    static async getActivePayMethods(req: Request, res: Response) {
        try {
            const payMethods = await PayMethode.findAll({
                where: { isActive: true },
                order: [['name', 'ASC']]
            });
            
            res.json(payMethods);
        } catch (error) {
            console.error('Error obteniendo métodos de pago activos:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    // Obtener un método de pago por ID
    static async getPayMethodById(req: Request, res: Response) {
        try {
            res.json(req.payMethod);
        } catch (error) {
            console.error('Error obteniendo método de pago:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    // Crear un nuevo método de pago
    static async createPayMethod(req: Request, res: Response) {
        try {

            const parsed = payMethodSchema.safeParse(req.body)

            if (!parsed.success) {
                res.status(400).json({
                    error: 'Datos de entrada inválidos',
                
                });
                return
            }

            const { name } = parsed.data;

            // Verificar si ya existe un método con ese nombre
            const existingMethod = await PayMethode.findOne({ where: { name } });
            if (existingMethod) {
                res.status(400).json({
                    error: 'Ya existe un método de pago con ese nombre'
                });
                return 
            }
            
            const newPayMethod = await PayMethode.create({
                name
            });

            res.status(201).send('Método de pago creado correctamente');
        } catch (error) {
            console.error('Error creando método de pago:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    // Actualizar un método de pago
    static async updatePayMethod(req: Request, res: Response) {
        try {
            const parsed = payMethodSchema.safeParse(req.body)

            if (!parsed.success) {
                res.status(400).json({
                    error: 'Datos de entrada inválidos',
                
                });
                return
            }

            const { name } = parsed.data;
            
            
            // Verificar si el nuevo nombre ya existe (si se está cambiando)
            if (name && name !== req.payMethod.dataValues.name) {
                const existingMethod = await PayMethode.findOne({ 
                    where: { 
                        name,
                        id: { [require('sequelize').Op.ne]: req.payMethod.dataValues.id }
                    }
                });
                if (existingMethod) {
                    res.status(400).json({
                        error: 'Ya existe un método de pago con ese nombre'
                    });
                    return;
                }
            }
            
            await req.payMethod.update({
                name
            });
            
            res.send('Método de pago actualizado correctamente');
        } catch (error) {
            console.error('Error actualizando método de pago:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    // Desactivar un método de pago
    static async isActivatePayMethod(req: Request, res: Response) {
        try {
            const currentIsActive = req.payMethod.dataValues.isActive;
            
            await req.payMethod.update({ isActive: !currentIsActive });
            
            res.send(
                'Método de pago desactivado correctamente'
            );
        } catch (error) {
            console.error('Error desactivando método de pago:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

}

export default PayMethodeController;