import { Router } from "express";
import raffleNumbersControllers from "../controllers/raffleNumbersController";
import { authenticate, authenticateSharedLink, checkRole, validateUserRaffle } from "../middlewares/auth";
import { raffleExists, raffleNumberExists } from "../middlewares/model";
import { validateIdParam, validateSchema } from "../middlewares/validateAuth";
import { amountRaffleNumberSchema, raffleNumbersIdsShema, sellRaffleNumbersSchema, updateRaffleNumber, validateRaffleNumbersStatus } from "../middlewares/validateRaffle";

const router = Router()

router.get('/shared/number/:raffleNumberId',
    authenticateSharedLink,
    validateIdParam('raffleNumberId'),
    raffleNumberExists,
    raffleNumbersControllers.getRaffleNumberByIdShared
)

router.get('/shared',
    authenticateSharedLink,
    raffleNumbersControllers.getRaffleNumbersShared
)

router.post('/shared/amount-number/:raffleNumberId',
    authenticateSharedLink,
    validateIdParam('raffleNumberId'),
    validateSchema(amountRaffleNumberSchema),
    raffleNumberExists,
    raffleNumbersControllers.amountRaffleNumberShared
)

router.get('/:raffleId',
    authenticate,
    validateIdParam('raffleId'),
    raffleExists,
    raffleNumbersControllers.getRaffleNumbers
)

router.get('/:raffleId/exel',
    authenticate,
    validateIdParam('raffleId'),
    raffleExists,
    raffleNumbersControllers.getRaffleNumbersForExel
)
router.get('/:raffleId/exel-filter',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('raffleId'),
    raffleExists,
    raffleNumbersControllers.getRaffleNumbersForExelFilter
)

router.get('/:raffleId/number/pending-numbers',
    authenticate,
    validateIdParam('raffleId'),
    validateSchema(raffleNumbersIdsShema),
    raffleExists,
    raffleNumbersControllers.getRaffleNumbersPendingSell
)

router.get('/:raffleId/number/:raffleNumberId',
    authenticate,
    validateIdParam('raffleId'),
    validateIdParam('raffleNumberId'),
    raffleExists,
    raffleNumberExists,
    raffleNumbersControllers.getRaffleNumberById
)

router.post('/:raffleId/sell-numbers',
    authenticate,
    checkRole(['vendedor', 'responsable']),
    validateIdParam('raffleId'),
    validateSchema(sellRaffleNumbersSchema),
    raffleExists,
    validateRaffleNumbersStatus,
    validateUserRaffle,
    raffleNumbersControllers.sellRaffleNumbers
)

router.post('/:raffleId/amount-number/:raffleNumberId',
    authenticate,
    checkRole(['vendedor', 'responsable']),
    validateIdParam('raffleId'),
    validateIdParam('raffleNumberId'),
    validateSchema(amountRaffleNumberSchema),
    raffleExists,
    raffleNumberExists,
    validateUserRaffle,
    raffleNumbersControllers.amountRaffleNumber
)

router.put('/:raffleId/update-number/:raffleNumberId',
    authenticate,
    checkRole(['admin', 'responsable', 'vendedor']),
    validateIdParam('raffleId'),
    validateIdParam('raffleNumberId'),
    validateSchema(updateRaffleNumber),
    raffleExists,
    raffleNumberExists,
    validateUserRaffle,
    raffleNumbersControllers.updateRaffleNumber
)

router.delete('/:raffleId/delete-client/:raffleNumberId',
    authenticate,
    checkRole(['vendedor', 'responsable']),
    validateIdParam('raffleId'),
    validateIdParam('raffleNumberId'),
    raffleExists,
    raffleNumberExists,
    validateUserRaffle,
    raffleNumbersControllers.deleteClientRaffleNumber
)

export default router