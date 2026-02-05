import { Router } from "express";
import EngageLabController from "../controllers/webhooksController";
import { authenticate, checkRole } from "../middlewares/auth";

const router = Router()

// Endpoints

router.post('/create-org',
    authenticate,
    checkRole(['admin', 'responsable']),
    EngageLabController.createOrgID
)

router.get('/sdk-config',
    authenticate,
    checkRole(['admin', 'responsable']),
    EngageLabController.getWhatsAppSdkConfig
)

// Webhook endpoint to receive events from EngageLab

router.post('/register',
    EngageLabController.registerWebhook
)

export default router