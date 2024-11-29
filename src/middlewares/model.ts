import { Response, Request, NextFunction } from "express";
import User from "../models/user";
import Rol from "../models/rol";
import { Op } from "sequelize";
import Raffle from "../models/raffle";
import RaffleNumbers from "../models/raffle_numbers";

declare global { 
    namespace Express {
        interface Request {
            raffle: Raffle
            raffleNumber: RaffleNumbers
        }
    }
}

const elementExists = function (res:Response, model: User | Raffle | RaffleNumbers) {
    if (!model) {
        const error = new Error('Elemento no Encontrado')
        res.status(404).json({error: error.message})
        return false
    }
    return true
}

export async function userExists(req:Request, res:Response, next:NextFunction) {
    const {userId} = req.params
    try {
        const user = await User.findByPk(userId, {
            attributes: {exclude: ['password']},
            include: [
                {
                    model: Rol,
                    as : 'rol',
                    attributes : ['name'],
                    where: {
                        name:{ [Op.ne]: 'admin'} 
                    }
                }
            ]
        })
        if (!elementExists(res, user)) return
        req.user = user
        next()
    } catch (error) {
        res.status(500).json({error: 'Hubo un Error - models'})
    }
}
export async function raffleExists(req:Request, res:Response, next:NextFunction) {
    const {raffleId} = req.params
    try {
        const raffle = await Raffle.findByPk(raffleId, {
            attributes: ['id', 'price', 'startDate', 'editDate', 'price'],
        })
        if (!elementExists(res, raffle)) return
        req.raffle = raffle
        next()
    } catch (error) {
        res.status(500).json({error: 'Hubo un Error - models'})
    }
}
export async function raffleNumberExists(req:Request, res:Response, next:NextFunction) {
    const {raffleNumberId, raffleId} = req.params
    try {
        const raffleNumber = await RaffleNumbers.findOne({
            where: {
                id: raffleNumberId,
                raffleId: raffleId
            }
        })
        if (!elementExists(res, raffleNumber)) return
        req.raffleNumber = raffleNumber
        next()
    } catch (error) {
        res.status(500).json({error: 'Hubo un Error - models'})
    }
}