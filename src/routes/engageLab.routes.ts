import { Router } from "express";
import EngageLabController from "../controllers/webhooksController";

const router = Router()

router.post('/register',
    EngageLabController.registerWebhook
)

export default router