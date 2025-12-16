import { Router } from "express";
import whatsappController from "../controllers/whatsappController";
import { validateSchema } from "../middlewares/validateAuth";
import { whatsappSendRaffleSummarySchema } from "../middlewares/validateWhatsapp";
import { authenticate, checkRole } from "../middlewares/auth";

const router = Router();

router.post("/send-message",
    authenticate,
    checkRole(['admin', 'responsable', 'vendedor']),
    validateSchema(whatsappSendRaffleSummarySchema),
    whatsappController.sendRaffleSummary
);

export default router;