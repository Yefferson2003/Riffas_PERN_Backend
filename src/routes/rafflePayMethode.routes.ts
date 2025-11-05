import { Router } from "express";
import RafflePayMethodeController from "../controllers/rafflePayMethodeController";
import { authenticate, checkRole, validateUserRaffle } from "../middlewares/auth";
import { raffleExists, rafflePayMethodExists } from "../middlewares/model";
import { validateIdParam, validateSchema } from "../middlewares/validateAuth";
import { assignPayMethodToRaffleSchema } from "../middlewares/validateRafflePayMethod";

const router = Router()

// Obtener métodos de pago activos de una rifa específica
router.get('/:raffleId/payment-methods',
    // authenticate,
    validateIdParam('raffleId'),
    raffleExists,
    validateUserRaffle,
    RafflePayMethodeController.getRafflePayMethods
)

// Obtener todos los métodos de pago de una rifa (incluidos inactivos) - Solo admin
router.get('/:raffleId/payment-methods/all',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('raffleId'),
    raffleExists,
    RafflePayMethodeController.getAllRafflePayMethods
)

// Asignar método de pago a una rifa
router.post('/:raffleId/payment-methods',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('raffleId'),
    validateSchema(assignPayMethodToRaffleSchema),
    raffleExists,
    validateUserRaffle,
    RafflePayMethodeController.assignPayMethodToRaffle
)

// Actualizar método de pago asignado a una rifa
router.put('/payment-methods/:rafflePayMethodId',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('rafflePayMethodId'),
    validateSchema(assignPayMethodToRaffleSchema),
    rafflePayMethodExists,
    RafflePayMethodeController.updateRafflePayMethod
)

// Estado método de pago de una rifa
router.patch('/payment-methods/:rafflePayMethodId/deactivate',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('rafflePayMethodId'),
    rafflePayMethodExists,
    RafflePayMethodeController.statusRafflePayMethod
)


export default router;