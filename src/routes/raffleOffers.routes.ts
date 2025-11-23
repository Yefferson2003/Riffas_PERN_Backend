import { Router } from "express";
import RaffleOffersController from "../controllers/raffleOffersController";
import { authenticate, checkRole, validateUserRaffle } from "../middlewares/auth";
import { raffleExists, raffleOfferExists } from "../middlewares/model";
import { validateIdParam, validateSchema } from "../middlewares/validateAuth";
import { createRaffleOfferSchema } from "../middlewares/validateRaffleOffer";

const router = Router();

// Obtener ofertas activas de una rifa específica
router.get('/:raffleId/offers',
    validateIdParam('raffleId'),
    raffleExists,
    RaffleOffersController.getRaffleOffers
);

// Obtener todas las ofertas de una rifa (incluidas inactivas) - Solo admin/responsable
router.get('/:raffleId/offers/all',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('raffleId'),
    raffleExists,
    RaffleOffersController.getAllRaffleOffers
);

// Obtener oferta por ID
router.get('/:raffleId/offers/:raffleOfferId',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('raffleId'),
    validateIdParam('raffleOfferId'),
    raffleExists,
    raffleOfferExists,
    RaffleOffersController.getRaffleOfferById
);

// Crear oferta para una rifa
router.post('/:raffleId/offers',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('raffleId'),
    validateSchema(createRaffleOfferSchema),
    raffleExists,
    validateUserRaffle,
    RaffleOffersController.createRaffleOffer
);

// Actualizar oferta de una rifa
router.put('/:raffleId/offers/:raffleOfferId',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('raffleId'),
    validateIdParam('raffleOfferId'),
    validateSchema(createRaffleOfferSchema),
    raffleExists,
    raffleOfferExists,
    RaffleOffersController.updateRaffleOffer
);

// Cambiar estado de oferta (activar/desactivar)
router.patch('/:raffleId/offers/:raffleOfferId',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('raffleId'),
    validateIdParam('raffleOfferId'),
    raffleExists,
    raffleOfferExists,
    RaffleOffersController.statusRaffleOffer
);

// Eliminar oferta
router.delete('/:raffleId/offers/:raffleOfferId',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('raffleId'),
    validateIdParam('raffleOfferId'),
    raffleExists,
    raffleOfferExists,
    RaffleOffersController.deleteRaffleOffer
);

export default router;
