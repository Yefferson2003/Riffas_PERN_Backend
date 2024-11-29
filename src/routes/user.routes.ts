import { Router } from "express";
import userController from "../controllers/userController";
import { authenticate, checkRole } from "../middlewares/auth";
import { validateIdParam, validateSchema } from "../middlewares/validateAuth";
import { userExists } from "../middlewares/model";
import { updatePasswordUserSchema, updateUserSchema } from "../middlewares/validateUser";

const router = Router()

router.get('/',
    authenticate,
    checkRole(['admin']),
    userController.getUsers
)

router.get('/:userId',
    authenticate,
    checkRole(['admin']),
    validateIdParam('userId'),
    userExists,
    userController.getUserById
)

router.put('/:userId',
    authenticate,
    checkRole(['admin']),
    validateIdParam('userId'),
    validateSchema(updateUserSchema),
    userExists,
    userController.updateUser
)

router.put('/:userId/update-password',
    authenticate,
    checkRole(['admin']),
    validateIdParam('userId'),
    validateSchema(updatePasswordUserSchema),
    userExists,
    userController.updatePasswordUser
)

router.delete('/:userId',
    authenticate,
    checkRole(['admin']),
    validateIdParam('userId'),
    userExists,
    userController.deleteUser
)



export default router