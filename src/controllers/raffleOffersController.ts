import { Request, Response } from "express";
import RaffleOffer from "../models/raffleOffers";
import { createRaffleOfferSchema } from "../middlewares/validateRaffleOffer";

class RaffleOffersController {
    
    // Obtener ofertas activas de una rifa específica
    static async getRaffleOffers(req: Request, res: Response) {
        try {
            
            const raffleOffers = await RaffleOffer.findAll({
                where: { 
                    raffleId: req.raffle.id,
                    isActive: true 
                },
                order: [['minQuantity', 'ASC']]
            });
            
            res.json(raffleOffers);
        } catch (error) {
            console.error('Error obteniendo ofertas de la rifa:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    // Obtener todas las ofertas de una rifa (incluidas inactivas) - Solo admin
    static async getAllRaffleOffers(req: Request, res: Response) {
        try {
            
            const raffleOffers = await RaffleOffer.findAll({
                where: { raffleId: req.raffle.id },
                order: [['minQuantity', 'ASC']]
            });
            
            res.json(raffleOffers);
        } catch (error) {
            console.error('Error obteniendo todas las ofertas de la rifa:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    // Obtener oferta por ID
    static async getRaffleOfferById(req: Request, res: Response) {
        try {
            res.json(req.raffleOffer);
        } catch (error) {
            console.error('Error obteniendo oferta:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    // Crear oferta para una rifa
    static async createRaffleOffer(req: Request, res: Response) {
        try {
            const parsed = createRaffleOfferSchema.safeParse(req.body);

            if (!parsed.success) {
                res.status(400).json({
                    error: 'Datos inválidos',
                    issues: parsed.error.issues
                });
                return;
            }

            const { minQuantity, discountedPrice } = parsed.data;

            // Validar que el precio con descuento sea menor al precio normal
            if (discountedPrice >= req.raffle.dataValues.price) {
                res.status(400).json({
                    error: 'El precio con descuento debe ser menor al precio normal de la rifa'
                });
                return;
            }

            // Verificar si ya existe una oferta con la misma cantidad mínima
            const existingOffer = await RaffleOffer.findOne({
                where: { 
                    raffleId: req.raffle.id, 
                    minQuantity 
                }
            });
            
            if (existingOffer) {
                res.status(400).json({
                    error: 'Ya existe una oferta con esta cantidad mínima para esta rifa'
                });
                return;
            }
            
            const newOffer = await RaffleOffer.create({
                raffleId: req.raffle.id,
                minQuantity,
                discountedPrice,
                isActive: true
            });
            
            res.status(201).send("Oferta creada correctamente");
        } catch (error) {
            console.error('Error creando oferta para la rifa:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    // Actualizar oferta de una rifa
    static async updateRaffleOffer(req: Request, res: Response) {
        try {
            const parsed = createRaffleOfferSchema.safeParse(req.body);

            if (!parsed.success) {
                res.status(400).json({
                    error: 'Datos inválidos',
                    issues: parsed.error.issues
                });
                return;
            }

            const { minQuantity, discountedPrice } = parsed.data;

            // Obtener la rifa asociada
            const raffleId = req.raffleOffer.dataValues.raffleId;
            const raffle = await req.raffleOffer.$get('raffle');

            // Validar que el precio con descuento sea menor al precio normal
            if (discountedPrice >= raffle.dataValues.price) {
                res.status(400).json({
                    error: 'El precio con descuento debe ser menor al precio normal de la rifa'
                });
                return;
            }

            // Verificar si ya existe otra oferta con la misma cantidad mínima
            const existingOffer = await RaffleOffer.findOne({
                where: { 
                    raffleId, 
                    minQuantity 
                }
            });
            
            if (existingOffer && existingOffer.id !== req.raffleOffer.id) {
                res.status(400).json({
                    error: 'Ya existe otra oferta con esta cantidad mínima para esta rifa'
                });
                return;
            }
            
            await req.raffleOffer.update({
                minQuantity,
                discountedPrice
            });
            
            res.send('Oferta actualizada correctamente');
        } catch (error) {
            console.error('Error actualizando oferta de la rifa:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    // Cambiar estado de oferta de una rifa (activar/desactivar)
    static async statusRaffleOffer(req: Request, res: Response) {
        try {
            const currentStatus = req.raffleOffer.dataValues.isActive;

            await req.raffleOffer.update({ isActive: !currentStatus });
            res.send(`Oferta ${currentStatus ? 'desactivada' : 'activada'} correctamente`);
        } catch (error) {
            console.error('Error cambiando estado de oferta:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    // Eliminar oferta de una rifa
    static async deleteRaffleOffer(req: Request, res: Response) {
        try {
            await req.raffleOffer.destroy();
            res.send('Oferta eliminada correctamente');
        } catch (error) {
            console.error('Error eliminando oferta:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }
}

export default RaffleOffersController;
