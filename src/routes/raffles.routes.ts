import { Router } from "express";
import { authenticate, checkRole } from "../middlewares/auth";
import { validateIdParam, validateSchema } from "../middlewares/validateAuth";
import { createRifaSchema, updateRifaSchema } from "../middlewares/validateRaffle";
import raffleController from "../controllers/raffleController";
import { raffleExists, userExists } from "../middlewares/model";

const router = Router()

router.get('/', 
    authenticate,
    raffleController.getRaffles
);

router.get('/:raffleId', 
    authenticate,
    validateIdParam('raffleId'),
    raffleExists,
    raffleController.getRaffleById
)

router.post('/', 
    authenticate,
    checkRole(['admin']),
    validateSchema(createRifaSchema),
    raffleController.createRaffle
);

router.put('/:raffleId',
    authenticate,
    checkRole(['admin']),
    validateIdParam('raffleId'),
    validateSchema(updateRifaSchema),
    raffleExists,
    raffleController.updateRaffle
)

router.get('/:raffleId/assing-user',
    authenticate,
    checkRole(['admin']),
    validateIdParam('raffleId'),
    raffleExists,
    raffleController.getUsersRaffle
)

router.post('/:raffleId/assing-user/:userId',
    authenticate,
    checkRole(['admin']),
    validateIdParam('raffleId'),
    validateIdParam('userId'),
    raffleExists,
    userExists,
    raffleController.assingUser
)

router.delete('/:raffleId/assing-user/:userId',
    authenticate,
    checkRole(['admin']),
    validateIdParam('raffleId'),
    validateIdParam('userId'),
    raffleExists,
    userExists,
    raffleController.deleteAssingUser
)

export default router