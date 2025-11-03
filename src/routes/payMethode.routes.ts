import { Router } from "express";
import PayMethodeController from "../controllers/payMethodeController";
import { authenticate, checkRole } from "../middlewares/auth";
import { payMethodExists } from "../middlewares/model";
import { validateIdParam, validateSchema } from "../middlewares/validateAuth";
import {  payMethodSchema } from "../middlewares/validatePayMethod";

const router = Router()

// Obtener todos los métodos de pago (solo admin)
router.get('/',
    authenticate,
    checkRole(['admin']),
    PayMethodeController.getPayMethods
)

// Obtener métodos de pago activos (todos los roles autenticados)
router.get('/active',
    authenticate,
    PayMethodeController.getActivePayMethods
)

// Obtener un método de pago por ID
router.get('/:payMethodId',
    authenticate,
    validateIdParam('payMethodId'),
    payMethodExists,
    PayMethodeController.getPayMethodById
)

// Crear un nuevo método de pago (solo admin)
router.post('/',
    authenticate,
    checkRole(['admin']),
    validateSchema(payMethodSchema),
    PayMethodeController.createPayMethod
)

// Actualizar un método de pago (solo admin)
router.put('/:payMethodId',
    authenticate,
    checkRole(['admin']),
    validateIdParam('payMethodId'),
    validateSchema(payMethodSchema),
    payMethodExists,
    PayMethodeController.updatePayMethod
)

// Desactivar un método de pago (solo admin)
router.patch('/:payMethodId/status-isActive',
    authenticate,
    checkRole(['admin']),
    validateIdParam('payMethodId'),
    payMethodExists,
    PayMethodeController.isActivatePayMethod
)



export default router;