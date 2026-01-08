import { Router } from "express";
import awardsController from "../controllers/awardsController";
import ExpenseController from "../controllers/expensesController";
import raffleController from "../controllers/raffleController";
import { authenticate, authenticateSharedLink, checkRole } from "../middlewares/auth";
import { awardExists, ExpensesExists, raffleExists, userExists } from "../middlewares/model";
import { validateIdParam, validateSchema } from "../middlewares/validateAuth";
import { expenseSchema } from "../middlewares/validateExpenses";
import { createRifaSchema, expirationDaysSchema, updateRifaSchema, URLRaffleSchema } from "../middlewares/validateRaffle";
import { awardSchema } from "../middlewares/validateAwards";

const router = Router()

router.get('/', 
    authenticate,
    raffleController.getRaffles
);

router.get('/details-numbers', 
    authenticate,
    checkRole(['responsable', 'admin']),
    raffleController.getRafflesDetailsNumbers
);

router.get('/shared', 
    authenticateSharedLink,
    raffleController.getRaffleShared
)

router.get('/awards/shared',
    authenticateSharedLink,
    awardsController.getAwardsByRaffleShared
)

router.get('/:raffleId', 
    authenticate,
    validateIdParam('raffleId'),
    raffleExists,
    raffleController.getRaffleById
)

router.post('/', 
    authenticate,
    checkRole(['admin', 'responsable']),
    validateSchema(createRifaSchema),
    raffleController.createRaffle
);

router.get('/:raffleId/URL', 
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('raffleId'),
    raffleExists,
    raffleController.GetshareUrlRaffleByRaffleId
);

router.post('/:raffleId/URL', 
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('raffleId'),
    validateSchema(expirationDaysSchema),
    raffleExists,
    raffleController.shareUrlRaffleShort
);

router.delete('/:raffleId/URL/:urlId', 
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('raffleId'),
    validateIdParam('urlId'),
    raffleExists,
    raffleController.deleteSharedUrlRaffle
);

router.put('/:raffleId',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('raffleId'),
    validateSchema(updateRifaSchema),
    raffleExists,
    raffleController.updateRaffle
)

router.get('/:raffleId/assing-user',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('raffleId'),
    raffleExists,
    raffleController.getUsersRaffle
)
router.get('/:raffleId/recaudo',
    authenticate,
    validateIdParam('raffleId'),
    raffleExists,
    raffleController.getRecaudo
)
router.get('/:raffleId/recaudoByVendedor',
    authenticate,
    checkRole(['vendedor']),
    validateIdParam('raffleId'),
    raffleExists,
    raffleController.getRecaudoByVendedor
)

router.post('/:raffleId/assing-user/:userId',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('raffleId'),
    validateIdParam('userId'),
    raffleExists,
    userExists,
    raffleController.assingUser
)

router.delete('/:raffleId/assing-user/:userId',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('raffleId'),
    validateIdParam('userId'),
    raffleExists,
    userExists,
    raffleController.deleteAssingUser
)

router.delete('/:raffleId',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('raffleId'),
    raffleExists,
    raffleController.deleteRaffle
)

router.get('/:raffleId/expenses-total',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('raffleId'),
    raffleExists,
    ExpenseController.getTotalExpenses
)
router.get('/:raffleId/expenses-total-user',
    authenticate,
    checkRole([ 'responsable', 'vendedor']),
    validateIdParam('raffleId'),
    raffleExists,
    ExpenseController.getTotalExpensesByUser
)

router.get('/:raffleId/expenses-by-raffle',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('raffleId'),
    raffleExists,
    ExpenseController.getAllExpenses
)

router.get('/:raffleId/expenses',
    authenticate,
    checkRole(['admin', 'responsable', 'vendedor']),
    validateIdParam('raffleId'),
    raffleExists,
    ExpenseController.getExpenses
)

router.get('/:raffleId/expenses/:expenseId',
    authenticate,
    checkRole(['admin', 'responsable', 'vendedor']),
    validateIdParam('raffleId'),
    validateIdParam('expenseId'),
    raffleExists,
    ExpensesExists,
    ExpenseController.getExpenseById
)

router.post('/:raffleId/expenses',
    authenticate,
    checkRole(['admin', 'responsable', 'vendedor']),
    validateIdParam('raffleId'),
    raffleExists,
    validateSchema(expenseSchema),
    ExpenseController.createExpense
)

router.put('/:raffleId/expenses/:expenseId',
    authenticate,
    checkRole(['admin', 'responsable', 'vendedor']),
    validateIdParam('raffleId'),
    validateIdParam('expenseId'),
    validateSchema(expenseSchema),
    raffleExists,
    ExpensesExists,
    ExpenseController.updateExpense
)

router.delete('/:raffleId/expenses/:expenseId',
    authenticate,
    checkRole(['admin', 'responsable', 'vendedor']),
    validateIdParam('raffleId'),
    validateIdParam('expenseId'),
    raffleExists,
    ExpensesExists,
    ExpenseController.deleteExpense
)

router.get('/:raffleId/awards/',
    authenticate,
    checkRole(['admin', 'responsable', 'vendedor']),
    validateIdParam('raffleId'),
    raffleExists,
    awardsController.getAwardsByRaffles
)

router.get('/:raffleId/awards/:awardId',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('raffleId'),
    validateIdParam('awardId'),
    raffleExists,
    awardExists,
    awardsController.getAwardsById
)

router.post('/:raffleId/awards/',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('raffleId'),
    raffleExists,
    validateSchema(awardSchema),
    awardsController.createAwards
)

router.put('/:raffleId/awards/:awardId',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('raffleId'),
    validateIdParam('awardId'),
    raffleExists,
    awardExists,
    validateSchema(awardSchema),
    awardsController.updateAwards
)

router.delete('/:raffleId/awards/:awardId',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('raffleId'),
    validateIdParam('awardId'),
    raffleExists,
    awardExists,
    awardsController.deleteAward
)

export default router