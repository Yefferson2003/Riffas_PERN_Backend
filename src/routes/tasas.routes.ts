import { Router } from "express";
import { authenticate, checkRole } from "../middlewares/auth";
import TasaController from "../controllers/tasaController";
import { validateIdParam, validateSchema } from "../middlewares/validateAuth";
import { createMonedaSchema, createTasaSchema, updateMonedaSchema, updateTasaSchema } from "../middlewares/validateTasas";
import { monedaExists, userTasaExists } from "../middlewares/model";

const router = Router();

router.get('/',
    authenticate,
    checkRole(['admin', 'responsable', 'vendedor']),
    TasaController.getAllMonedas
);

router.post('/',
    authenticate,
    checkRole(['admin']),
    validateSchema(createMonedaSchema),
    TasaController.createMoneda
)

router.put('/:monedaId',
    authenticate,
    checkRole(['admin']),
    validateIdParam('monedaId'),
    validateSchema(updateMonedaSchema),
    monedaExists,
    TasaController.updateMoneda
)

router.delete('/:monedaId',
    authenticate,
    checkRole(['admin']),
    validateIdParam('monedaId'),
    monedaExists,
    TasaController.deleteMoneda
)

router.get('/user-tasas',
    authenticate,
    checkRole(['admin', 'responsable', 'vendedor']),
    TasaController.getAllUserTasas
)

router.post('/user-tasas/moneda/:monedaId',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('monedaId'),
    monedaExists,
    validateSchema(createTasaSchema),
    TasaController.createUserTasa
)

router.put('/user-tasas/:tasaId',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('tasaId'),
    validateSchema(updateTasaSchema),
    userTasaExists,
    TasaController.updateUserTasa
)

router.delete('/user-tasas/:tasaId',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('tasaId'),
    userTasaExists,
    TasaController.deleteUserTasa
)



export default router;