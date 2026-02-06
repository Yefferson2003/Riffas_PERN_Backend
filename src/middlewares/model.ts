import { Response, Request, NextFunction } from "express";
import User from "../models/user";
import Rol from "../models/rol";
import { Op } from "sequelize";
import Raffle from "../models/raffle";
import RaffleNumbers from "../models/raffle_numbers";
import Expenses from "../models/expenses";
import Awards from "../models/awards";
import PayMethode from "../models/payMethode";
import RafflePayMethode from "../models/rafflePayMethode";
import RaffleOffer from "../models/raffleOffers";
import Clients from "../models/clients";
import Moneda from "../models/moneda";
import UserTasas from "../models/userTasas";

declare global { 
    namespace Express {
        interface Request {
            raffle: Raffle
            raffleNumber: RaffleNumbers
            expense: Expenses
            award: Awards
            payMethod: PayMethode
            rafflePayMethod: RafflePayMethode
            raffleOffer: RaffleOffer
            client: Clients
            moneda: Moneda
            tasa: UserTasas
        }
    }
}

const elementExists = function (res:Response, model: User | Raffle | RaffleNumbers | Expenses | Awards | PayMethode | RafflePayMethode | RaffleOffer | Clients | Moneda | UserTasas | null) {
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
            attributes: ['id', 'price','name', 'startDate', 'editDate', 'description', 'playDate'],
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
                raffleId: raffleId || req.raffle.id
            }
        })
        if (!elementExists(res, raffleNumber)) return
        req.raffleNumber = raffleNumber
        next()
    } catch (error) {
        res.status(500).json({error: 'Hubo un Error - models'})
    }
}

export async function ExpensesExists(req:Request, res:Response, next:NextFunction) {
    const {raffleId, expenseId} = req.params
    try {
        const expense = await Expenses.findOne({
            where: {
                id: expenseId,
                raffleId: raffleId
            }
        })
        if (!elementExists(res, expense)) return
        req.expense = expense
        next()
    } catch (error) {
        res.status(500).json({error: 'Hubo un Error - models'})
    }
}

export async function awardExists(req:Request, res:Response, next:NextFunction) {
    const {raffleId, awardId} = req.params
    try {
        const award = await Awards.findOne({
            where: {
                id: awardId,
                raffleId: raffleId
            }
        })
        if (!elementExists(res, award)) return
        req.award = award
        next()
    } catch (error) {
        res.status(500).json({error: 'Hubo un Error - models'})
    }
}

export const payMethodExists = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { payMethodId } = req.params
        const payMethod = await PayMethode.findByPk(payMethodId)
        if (!elementExists(res, payMethod)) return
        req.payMethod = payMethod
        next()
    } catch (error) {
        res.status(500).json({error: 'Hubo un Error - models'})
    }
}

export const rafflePayMethodExists = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { rafflePayMethodId } = req.params
        const rafflePayMethod = await RafflePayMethode.findByPk(rafflePayMethodId, {
            include: [
                {
                    model: PayMethode,
                    as: 'payMethode',
                    attributes: ['name']
                }
            ]
        })
        if (!elementExists(res, rafflePayMethod)) return
        req.rafflePayMethod = rafflePayMethod
        next()
    } catch (error) {
        res.status(500).json({error: 'Hubo un Error - models'})
    }
}

export const raffleOfferExists = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { raffleOfferId } = req.params

        if (!req.raffle) {
            const error = new Error('La rifa no está definida en la solicitud')
            res.status(400).json({error: error.message})
            return
        }

        const raffleOffer = await RaffleOffer.findOne({
            where: {
                id: raffleOfferId,
                raffleId: req.raffle.id
            }

            // include: [
            //     {
            //         model: Raffle,
            //         as: 'raffle',
            //         attributes: ['id', 'price']
            //     }
            // ]
        })
        if (!elementExists(res, raffleOffer)) return
        req.raffleOffer = raffleOffer
        next()
    } catch (error) {
        res.status(500).json({error: 'Hubo un Error - models'})
    }
}

export const clientExists = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { clientId } = req.params 
        const client = await Clients.findByPk(clientId)
        if (!elementExists(res, client)) return
        req.client = client
        next()
    } catch (error) {
        res.status(500).json({error: 'Hubo un Error - models'})
    }
}

export const monedaExists = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { monedaId } = req.params
        const moneda = await Moneda.findByPk(monedaId)
        if (!elementExists(res, moneda)) return
        req.moneda = moneda
        next()
    } catch (error) {
        res.status(500).json({error: 'Hubo un Error - models'})
    }
}

export const userTasaExists = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { tasaId } = req.params
        const tasa = await UserTasas.findByPk(tasaId)
        if (!elementExists(res, tasa)) return
        req.tasa = tasa
        next()
    } catch (error) {
        res.status(500).json({error: 'Hubo un Error - models'})
    }
}