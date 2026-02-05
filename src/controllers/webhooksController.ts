import { Request, Response } from 'express';
import { createOrganization } from '../middlewares/engageLabs';

class EngageLabController {

    static createOrganization = async (name: string, timezone: string) => {
        try {
            
        } catch (error) {
            
        }
    }

    static createOrgID = async (req: Request, res: Response) => {

        const { timezone, name} = req.body;

        try {

            if (req.user.dataValues.organizationId) {
                res.status(400).json({ error: 'Usuario ya tiene una organización' });
                return
            }

            const { org_id } = await createOrganization(
                `${name}`,
                timezone
            );

            if (!org_id) {
                res.status(500).json({ error: 'No se pudo crear la organización en EngageLab' });
                return 
            }

            await req.user.update({
                organizationId: org_id
            })

            res.status(201).json({ message: 'Organización creada y asignada al usuario' });
        
        } catch (error) {
            console.error('Error processing EngageLab webhook:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static getWhatsAppSdkConfig  = async (req: Request, res: Response) => {
        try {

            if (!req.user.dataValues.organizationId) {
                res.status(400).json({ error: 'Usuario no tiene una organización' });
                return 
            }

            res.status(200).json({
                organizationId: req.user.dataValues.organizationId,
                devKey: process.env.DEV_KEY_LAB,
                userId: req.user.id,
                logo: "https://i.ibb.co/FbD0SXqD/Dise-o-sin-t-tulo.png",
                bspName: "Riffas",
                locale: "en_US",
            })

        } catch (error) {
            console.error('Error processing EngageLab getWhatsAppSdkConfig()', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static deleteOrgOfUser = async (req: Request, res: Response) => {
        try {
            
        } catch (error) {
            
        }
    }

    static registerWebhook = async (req: Request, res: Response) => {
        try {
            // Process the incoming webhook data
            const eventData = req.body; 
            console.log('Received EngageLab webhook:', eventData);

            res.status(200).json({
                success: true,
            });
        } catch (error) {
            console.error('Error processing EngageLab webhook:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

export default EngageLabController; 