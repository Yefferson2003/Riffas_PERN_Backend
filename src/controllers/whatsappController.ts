import { Request, Response } from "express";
import axios from "axios";
import { whatsappSendRaffleSummarySchema } from "../middlewares/validateWhatsapp";

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN!;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const WHATSAPP_URL = process.env.WHATSAPP_URL!;

const whatsappController = {
    async sendRaffleSummary (req: Request, res: Response) {

        const parsedBody = whatsappSendRaffleSummarySchema.safeParse(req.body);

        if (!parsedBody.success) {
            res.status(400).json({ error: "Datos inválidos" });
            return;
        }

        const {
            to,
            imageUrl,
            name,
            actionMessage, // "Has apartado...", "Has abonado...", etc.
            raffleName,
            numbers,
            price,
            debt,
            playDate
        } = parsedBody.data;

    

        try {
            const response = await axios.post(
            `${WHATSAPP_URL}/${PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: "whatsapp",
                to,
                type: "template",
                template: {
                    name: "raffle_purchase_summary", // nombre EXACTO de la plantilla
                    language: {
                        code: "es_CO"
                    },
                    components: [
                        {
                        type: "header",
                        parameters: [
                            {
                            type: "image",
                            image: {
                                link: imageUrl // 👈 IMAGEN DINÁMICA
                            }
                            }
                        ]
                        },
                        {
                        type: "body",
                        parameters: [
                            { type: "text", text: name },
                            { type: "text", text: actionMessage },
                            { type: "text", text: raffleName },
                            { type: "text", text: numbers },
                            { type: "text", text: price },
                            { type: "text", text: debt },
                            { type: "text", text: playDate }
                        ]
                        }
                    ]
                }
            },
            {
                headers: {
                Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                "Content-Type": "application/json"
                }
            }
            );

            res.json({ success: true, data: response.data });

        } catch (error: any) {
            res.status(500).json({
            error: error?.response?.data || "Error enviando mensaje"
            });
        }
    },
};

export default whatsappController;
