import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Payment from '../models/payment';
import RaffleNumbers from '../models/raffle_numbers';
import User from '../models/user';

class paymentController {

    static getPaymnetsRaffleByUser = async (req: Request, res: Response) => {
        const {sold, pending, search, page = 1, limit = 10} = req.query

        const pageNumber = parseInt(page as string);
        const limitNumber = parseInt(limit as string);
        const offset = (pageNumber - 1) * limitNumber;
        try {

            let filter : any = {}

            if (sold && !pending) {
                filter.status = 'sold'
            }

            if (!sold && pending) {
                filter.status = 'pending'
            }

            if (sold && pending) {
                filter.status = {
                    [Op.or]: ['sold', 'pending'],
                };
            }

            if (!sold && !pending) {
                filter.status = {
                    [Op.ne]: 'available'
                };
            }

            if (search) {
                filter[Op.or] = [
                    { firstName: { [Op.like]: `%${search}%` } }, 
                    { lastName: { [Op.like]: `%${search}%` } },  
                    { identificationNumber:  { [Op.eq]: search }},
                    { phone: { [Op.eq]: search }}, 
                    { number: { [Op.eq]: +search } }, 
                ];
            }

            const {count, rows: numbersPayments} = await RaffleNumbers.findAndCountAll({
                distinct: true,
                attributes: ['id', 'number', 'status', 'reservedDate', 'identificationType', 'identificationNumber', 'firstName', 'lastName', 'phone', 'address', 'paymentAmount', 'paymentDue'],
                where: {
                    raffleId: req.raffle.id,
                    ...filter
                },
                include: [
                    {
                        model: Payment,
                        as: 'payments',
                        attributes: ['id', 'amount', 'paidAt', 'createdAt'],
                        where: {
                            userId: req.user.id
                        }
                    },
                ],
                limit: limitNumber,
                offset,
                order: [['number', 'ASC']],
            })

            res.json({
                total: count,
                numbersPayments,
                totalPages: Math.ceil(count / limitNumber),
                currentPage: pageNumber,
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }
    

    static getRaffleNumbersPaymentByRaffle = async (req: Request, res: Response) => {
        const {sold, pending, page = 1, limit = 10} = req.query

        const pageNumber = parseInt(page as string);
        const limitNumber = parseInt(limit as string);
        const offset = (pageNumber - 1) * limitNumber;

        try {

            let filter : any = {}

            if (sold && !pending) {
                filter.status = 'sold'
            }

            if (!sold && pending) {
                filter.status = 'pending'
            }

            if (sold && pending) {
                filter.status = {
                    [Op.or]: ['sold', 'pending'],
                };
            }

            if (!sold && !pending) {
                filter.status = {
                    [Op.ne]: 'available'
                };
            }

            const {count, rows: numbersPayments} = await RaffleNumbers.findAndCountAll({
                distinct: true,
                attributes: ['id', 'number', 'status', 'reservedDate', 'identificationType', 'identificationNumber', 'firstName', 'lastName', 'phone', 'address', 'paymentAmount', 'paymentDue'],
                where: {
                    raffleId: req.raffle.id,
                    ...filter
                },
                include: [
                    {
                        model: Payment,
                        as: 'payments',
                        attributes: ['id', 'amount', 'paidAt', 'createdAt'],
                    },
                ],
                limit: limitNumber,
                offset,
                order: [['number', 'ASC']],
            })

            res.json({
                total: count,
                numbersPayments,
                totalPages: Math.ceil(count / limitNumber),
                currentPage: pageNumber,
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    
}

export default paymentController