import { Router } from "express";
import { authenticate, checkRole, validateUserRaffle } from "../middlewares/auth";
import paymentController from "../controllers/paymentController";
import { validateIdParam } from "../middlewares/validateAuth";
import { raffleExists } from "../middlewares/model";

const router = Router()

router.get('/:raffleId',
    authenticate,
    checkRole(['vendedor', 'responsable','admin']),
    validateIdParam('raffleId'),
    raffleExists,
    validateUserRaffle,
    paymentController.getPaymnetsRaffleByUser
)

router.get('/:raffleId/numbers',
    authenticate,
    checkRole(['responsable', 'admin']),
    validateIdParam('raffleId'),
    raffleExists,
    validateUserRaffle,
    paymentController.getRaffleNumbersPaymentByRaffle
)

export default router