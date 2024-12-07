import {Response, Request} from 'express'
import Raffle from '../models/raffle';
import RaffleNumbers from '../models/raffle_numbers';
import UserRifa from '../models/user_raffle';
import User from '../models/user';
import { Op } from 'sequelize';
import Payment from '../models/payment';
import sequelize from 'sequelize';

class raffleController {

    static getRaffles = async (req : Request, res : Response) => {
        const {search, page = 1, limit = 4} = req.query

        const pageNumber = parseInt(page as string);
        const limitNumber = parseInt(limit as string);
        const offset = (pageNumber - 1) * limitNumber;
        try {
            let filter : any = {}

            if (search) {
                filter[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } }, 
                    { nitResponsable: { [Op.like]: `%${search}%` } },  
                    { nameResponsable: { [Op.like]: `%${search}%` } },  
                    { description: { [Op.like]: `%${search}%` } }, 
                ];
            }

            const isUser = req.user.dataValues.rol.dataValues.name !== 'admin'
            
            let filterUserRaffle : any = {}

            if (isUser) {
                filterUserRaffle.userId = req.user.id
            }

            const { count, rows: raffles} = await Raffle.findAndCountAll({
                distinct: true,
                attributes: ['id', 'name', 'description', 'startDate', 'playDate', 'editDate', 'price', 'banerImgUrl', 'nitResponsable', 'nameResponsable'],
                where: filter,
                ...(isUser ? { 
                    include: [
                        {
                            model: UserRifa,
                            as: 'userRiffle',
                            attributes: ['id'],
                            where: filterUserRaffle
                        }
                    ],
                } : {
                    
                }),
                limit: limitNumber,
                offset,
                order: [['id', 'DESC']],
            })

            res.json({
                total: count,
                raffles,
                totalPages: Math.ceil(count / limitNumber),
                currentPage: pageNumber,
            });

        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static getRaffleById = async (req : Request, res : Response) => {
        try {
            const raffle = await Raffle.findByPk(req.raffle.id,{
                include: [
                    {
                        model: UserRifa,
                        as: 'userRiffle',
                        attributes: ['userId']
                    }
                ]
            })

            res.json(raffle)
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static createRaffle = async (req : Request, res : Response) => {
        const {name, nitResponsable, nameResponsable, description, startDate, playDate, price, banerImgUrl, quantity = 1000} = req.body
        try {

            const editDate = new Date(playDate); 
            editDate.setMinutes(editDate.getMinutes() - 30);

            const raffle = await Raffle.create({
                name,
                nitResponsable,
                nameResponsable,
                description, 
                startDate,
                playDate,
                editDate,
                price,
                banerImgUrl
            })

            const numbers = Array.from({ length: quantity }, (_, i) => ({
                raffleId: raffle.id,
                number: i,
                paymentDue: price
            }));
            
            
            await RaffleNumbers.bulkCreate(numbers);

            res.status(201).send('Rifa creada correctamente')
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    } 

    static updateRaffle = async (req : Request, res : Response) => {
        const {name, description, banerImgUrl, nitResponsable, nameResponsable, startDate, playDate, editDate} = req.body
        try {
            await req.raffle.update({
                name,
                description,
                banerImgUrl,
                nitResponsable,
                nameResponsable,
                startDate,
                playDate,
                editDate
            })
            res.send('Rifa actualizada correctamente')
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static getUsersRaffle = async (req : Request, res : Response) => {
        try {

            let filter : any = {}
            filter.id = req.raffle.id

            const userRaffle = await UserRifa.findAll({
                attributes: ['id', 'role', 'assignedAt'],
                where: {rifaId: req.raffle.id},
                include: {
                    model: User,
                    as: 'user',
                    attributes: {exclude: ['password', 'address','rolId', 'createdAt', 'updatedAt', 'email' ]},
                    
                }
            })
            res.json(userRaffle)
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static getRecaudo  = async (req : Request, res : Response) => {
        try {

            const raffleNumbers = await RaffleNumbers.findAll({
                where: {
                    raffleId: req.raffle.id 
                },
                attributes: ['id'],
                include: [
                    {
                        model: Payment,
                        as: 'payments',
                        attributes: ['amount'], 
                        where: {
                            amount: { [Op.gt]: 0 } 
                        },
                        required: true 
                    }
                ]
            });

            const totalAmount = raffleNumbers.reduce((total, raffle) => {
                const raffleTotal = raffle.dataValues.payments.reduce((sum, payment) => sum + parseFloat(payment.dataValues.amount.toString()), 0);
                return total + raffleTotal;
            }, 0);


            res.status(200).json({total : totalAmount})
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static assingUser = async (req : Request, res : Response) => {
        try {

            const userRaffleExist = await UserRifa.findOne({
                where: {
                    userId: req.user.id,
                    rifaId: req.raffle.id,
                }
            })

            if (userRaffleExist) {
                const error = new Error('Assignacion ya creada')
                res.status(409).json({error: error.message})
                return
            }

            const userRaffle = await UserRifa.create({
                userId: req.user.id,
                rifaId: req.raffle.id,
                role: req.user.dataValues.rol.dataValues.name
            })
            
            req.app.get('io').emit('assigUser', {
                userId: req.user.id
            }); 

            res.status(201).send('Usuario asignado correctamente')
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static deleteAssingUser = async (req : Request, res : Response) => {
        try {
            const userRaffle = await UserRifa.findOne({
                where: {
                    userId: req.user.id,
                    rifaId: req.raffle.id,
                }
            })

            if (!userRaffle) {
                const error = new Error('Elemento no Encontrado')
                res.status(404).json({error: error.message})
                return
            }

            await userRaffle.destroy()

            req.app.get('io').emit('deleteAssigUser', {
                userId: req.user.id
            }); 

            res.status(201).send('Asignación eliminada correctamente')
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }
    static deleteRaffle = async (req : Request, res : Response) => {
        try {

            const raffleNumberIds = await RaffleNumbers.findAll({
                attributes: ['id'], 
                where: {
                    raffleId: req.raffle.id
                }
            });

            const ids = raffleNumberIds.map((raffleNumber) => raffleNumber.id);

            if (ids.length > 0) { 
                await Payment.destroy({
                    where: {
                        riffleNumberId: {
                            [Op.in]: ids
                        }
                    }
                });
            }
            await RaffleNumbers.destroy({
                where: {
                    raffleId: req.raffle.id
                }
            })

            await UserRifa.destroy({
                where: {
                    rifaId: req.raffle.id
                }
            })

            await req.raffle.destroy()

            req.app.get('io').emit('deleteRaffle'); 

            res.status(200).send('Rifa Elimina correctamente')
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }
}

export default raffleController