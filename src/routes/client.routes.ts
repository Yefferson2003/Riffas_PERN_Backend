import { Router } from "express";
import { authenticate, checkRole } from "../middlewares/auth";
import clientsController from "../controllers/clientsController";
import { validateIdParam, validateSchema } from "../middlewares/validateAuth";
import { clientExists } from "../middlewares/model";
import { buyNumbersForClientSchema, clientSchema, userClientExist } from "../middlewares/validateClient";

const router = Router()

router.get('/',
    authenticate,
    checkRole(['admin', 'responsable', 'vendedor']),
    clientsController.getClientsAll
)

router.get('/export-all',
    authenticate,
    checkRole(['admin', 'responsable', 'vendedor']),
    clientsController.getAllClientsForExport
)

router.get('/:clientId',
    authenticate,
    checkRole(['admin', 'responsable', 'vendedor']),
    validateIdParam('clientId'),
    clientExists,
    clientsController.getClientById
)

router.post('/',
    authenticate,
    checkRole(['admin', 'responsable', 'vendedor']),
    validateSchema(clientSchema),
    clientsController.createClient
)

router.post('/:clientId/buy-numbers',
    authenticate,
    checkRole(['admin', 'responsable', 'vendedor']),
    validateIdParam('clientId'),
    validateSchema(buyNumbersForClientSchema),
    clientExists,
    clientsController.buyNumbers
)

router.put('/:clientId',
    authenticate,
    checkRole(['admin', 'responsable', 'vendedor']),
    validateIdParam('clientId'),
    clientExists,
    userClientExist,
    validateSchema(clientSchema),
    clientsController.updateClient
)

export default router