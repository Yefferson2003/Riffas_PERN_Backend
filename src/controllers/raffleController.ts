import {Response, Request} from 'express'
import Raffle from '../models/raffle';
import RaffleNumbers from '../models/raffle_numbers';
import UserRifa from '../models/user_raffle';
import User from '../models/user';

class raffleController {

    static getRaffles = async (req : Request, res : Response) => {
        const { finalizada, pendig, cancel, page = 1, limit = 10} = req.query

        const pageNumber = parseInt(page as string);
        const limitNumber = parseInt(limit as string);
        const offset = (pageNumber - 1) * limitNumber;
        try {

            const isUser = req.user.dataValues.rol.dataValues.name !== 'admin'
            
            let filter : any = {}
            let filterUserRaffle : any = {}

            if (finalizada && !pendig && !cancel ) {
                filter.status = 'finally'
            }
            if (!finalizada && pendig && !cancel ) {
                filter.status = 'pendig'
            }
            if (!finalizada && !pendig && cancel ) {
                filter.status = 'cancel'
            }

            if (isUser) {
                filterUserRaffle.userId = req.user.id
            }

            const { count, rows: raffles} = await Raffle.findAndCountAll({
                distinct: true,
                attributes: ['id', 'name', 'description', 'status', 'startDate', 'playDate', 'editDate', 'price', 'banerImgUrl'],
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
            const raffle = await Raffle.findByPk(req.raffle.id)

            res.json(raffle)
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static createRaffle = async (req : Request, res : Response) => {
        const {name, description, startDate, playDate, price, banerImgUrl, quantity = 1000} = req.body
        try {

            const editDate = new Date(playDate); 
            editDate.setMinutes(editDate.getMinutes() - 30);

            const raffle = await Raffle.create({
                name,
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
        const {name, description, banerImgUrl} = req.body
        try {
            await req.raffle.update({
                name,
                description,
                banerImgUrl
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

            res.status(201).send('User assignado correctamente')
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

            res.status(201).send('Asignación eliminada correctamente')
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }
}

export default raffleController