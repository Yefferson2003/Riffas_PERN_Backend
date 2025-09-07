import Awards from "../models/awards";
import { Request, Response } from 'express';

class awardsController {

    static async getAwardsByRaffles(req: Request, res: Response) {
        try {
            const awards = await Awards.findAll({
                where: {
                    raffleId: req.raffle.id
                },
                order: [['playDate', 'ASC']]
            })

            res.json(awards)
        } catch (error) {
            console.log(error);
            res.status(500).json({errors: 'Hubo un Error'})
        }
    }

    static async getAwardsByRaffleShared(req: Request, res: Response) {
        try {
            const awards = await Awards.findAll({
                where: {
                    raffleId: req.raffle.id
                },
                order: [['playDate', 'ASC']]
            })

            res.json(awards)
        } catch (error) {
            console.log(error);
            res.status(500).json({errors: 'Hubo un Error'})
        }
    }

    static async getAwardsById(req: Request, res: Response)  {
        try {
            const award = req.award
            res.json(award)
        } catch (error) {
            console.log(error);
            res.status(500).json({errors: 'Hubo un Error'})
        }
    }

    static async createAwards (req: Request, res: Response)  {
        const { name, playDate } = req.body
        try {
            if (new Date(req.raffle.dataValues.playDate) < new Date(playDate)) {
                res.status(400).json({ errors: 'La fecha de juego del premio no puede ser posterior a la fecha de juego de la rifa' })
                return
            }

            const award = await Awards.create({
                name,
                playDate,
                raffleId: req.raffle.id
            })

            res.send('Premio agregado correctamente')
        } catch (error) {
            console.log(error);
            res.status(500).json({errors: 'Hubo un Error'})
        }
    }

    static async updateAwards (req: Request, res: Response)  {
        const { name, playDate } = req.body
        try {
            if (new Date(req.raffle.dataValues.playDate) < new Date(playDate)) {
                res.status(400).json({ errors: 'La fecha de juego del premio no puede ser posterior a la fecha de juego de la rifa' })
                return 
            }

            await req.award.update({
                name, playDate
            })

            res.send('Premio actualizado correctamente')
        } catch (error) {
            console.log(error);
            res.status(500).json({errors: 'Hubo un Error'})
        }
    }

    static async deleteAward (req: Request, res: Response)  {
        try {
            
            await req.award.destroy()

            res.send('Premio eliminado correctamente')
        } catch (error) {
            console.log(error);
            res.status(500).json({errors: 'Hubo un Error'})
        }
    }
}

export default awardsController