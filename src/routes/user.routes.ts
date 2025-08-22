import { Router } from "express";
import userController from "../controllers/userController";
import { authenticate, checkRole } from "../middlewares/auth";
import { validateIdParam, validateSchema } from "../middlewares/validateAuth";
import { userExists } from "../middlewares/model";
import { updateIsActiveUserSchema, updatePasswordUserSchema, updateUserSchema } from "../middlewares/validateUser";

const router = Router()

router.get('/',
    authenticate,
    checkRole(['admin', 'responsable']),
    userController.getUsers
)
router.get('/select',
    authenticate,
    checkRole(['admin', 'responsable']),
    userController.getUsersBySelect
)

router.get('/:userId',
    authenticate,
    checkRole(['admin' , 'responsable']),
    validateIdParam('userId'),
    userExists,
    userController.getUserById
)

router.put('/:userId/update-isActive',
    authenticate,
    checkRole(['admin' , 'responsable']),
    validateIdParam('userId'),
    // validateSchema(updateIsActiveUserSchema),
    userExists,
    userController.updateIsActiveUser
)

router.put('/:userId',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('userId'),
    validateSchema(updateUserSchema),
    userExists,
    userController.updateUser
)

router.put('/:userId/update-password',
    authenticate,
    checkRole(['admin' , 'responsable']),
    validateIdParam('userId'),
    validateSchema(updatePasswordUserSchema),
    userExists,
    userController.updatePasswordUser
)



router.delete('/:userId',
    authenticate,
    checkRole(['admin', 'responsable']),
    validateIdParam('userId'),
    userExists,
    userController.deleteUser
)



export default router