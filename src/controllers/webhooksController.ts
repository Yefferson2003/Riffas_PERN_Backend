import { Request, Response } from 'express';

class EngageLabController {
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