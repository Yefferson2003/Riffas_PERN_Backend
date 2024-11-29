import { Router } from "express";
import authController from "../controllers/authController";
import { createRolSchema, createUserSchema, loginSchema, validateSchema } from "../middlewares/validateAuth";
import { authenticate, checkRole } from "../middlewares/auth";

const router = Router()

router.get('/user',
    authenticate,
    authController.getUser
)

router.post('/create-rol',
    authenticate,
    checkRole(['admin']),
    validateSchema(createRolSchema),
    authController.creatRol
)

router.post('/create-user',
    authenticate,
    checkRole(['admin']),
    validateSchema(createUserSchema),
    authController.createUser
)

router.post('/login',
    validateSchema(loginSchema),
    authController.login
)

export default router