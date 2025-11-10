import { Request, Response } from 'express';
import jwt from "jsonwebtoken";
import { Op } from 'sequelize';
import Payment from '../models/payment';
import Raffle from '../models/raffle';
import RaffleNumbers from '../models/raffle_numbers';
import User from '../models/user';
import UserRifa from '../models/user_raffle';
import { v4 as uuidv4 } from "uuid";
import SharedLink from '../models/sharedLink';
import slugify from 'slugify';
import PayMethode from '../models/payMethode';
import RafflePayMethode from '../models/rafflePayMethode';

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
                attributes: ['id', 'name', 'description', 'startDate', 'playDate', 'editDate', 'price', 'banerImgUrl', 'nitResponsable', 'nameResponsable', 'banerMovileImgUrl'],
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

    static getRafflesDetailsNumbers = async (req: Request, res: Response) => {
        try {
            const userRole = req.user.dataValues.rol.dataValues.name;

            let filterUserRaffle: any = {};

            const include: any[] = [
                {
                    model: RaffleNumbers, 
                    as: 'raffleNumbers',
                    attributes: ['id', 'number', 'paymentAmount'],
                    where: {
                        status: 'sold'
                    }
                },

            ];


            if (userRole === 'responsable') {
                filterUserRaffle.userId = req.user.id;

                include.push({
                    model: UserRifa,
                    as: 'userRiffle',
                    attributes: [],
                    where: filterUserRaffle
                });
            }

            const raffles = await Raffle.findAll({
                attributes: ['id', 'name',],
                include
            });

            res.json(raffles);

        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Hubo un Error' });
        }
    };

    static getRaffleShared = async (req: Request, res: Response) => {
        try {
            // Contar la cantidad total de números de esta rifa
            const totalNumbers = await RaffleNumbers.count({
                where: {
                    raffleId: req.raffle.id
                }
            });


            // Contar números disponibles
            const availableNumbers = await RaffleNumbers.count({
                where: {
                    raffleId: req.raffle.id,
                    status: 'available'
                }
            });

            // Contar números vendidos
            const soldNumbers = await RaffleNumbers.count({
                where: {
                    raffleId: req.raffle.id,
                    status: 'sold'
                }
            });

            // Contar números pendientes
            const pendingNumbers = await RaffleNumbers.count({
                where: {
                    raffleId: req.raffle.id,
                    status: 'pending'
                }
            });

            // Contar números apartados
            const apartadoNumbers = await RaffleNumbers.count({
                where: {
                    raffleId: req.raffle.id,
                    status: 'apartado'
                }
            });

            const raffleWithTotal = {
                ...req.raffle.toJSON(),
                totalNumbers,
                numbersByStatus: {
                    available: availableNumbers,
                    sold: soldNumbers,
                    pending: pendingNumbers,
                    apartado: apartadoNumbers
                }
            };
            
            res.json(raffleWithTotal)

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

            // Contar la cantidad total de números de esta rifa
            const totalNumbers = await RaffleNumbers.count({
                where: {
                    raffleId: req.raffle.id
                }
            });

            // Contar números disponibles
            const availableNumbers = await RaffleNumbers.count({
                where: {
                    raffleId: req.raffle.id,
                    status: 'available'
                }
            });

            // Contar números vendidos
            const soldNumbers = await RaffleNumbers.count({
                where: {
                    raffleId: req.raffle.id,
                    status: 'sold'
                }
            });

            // Contar números pendientes
            const pendingNumbers = await RaffleNumbers.count({
                where: {
                    raffleId: req.raffle.id,
                    status: 'pending'
                }
            });

            // Contar números apartados
            const apartadoNumbers = await RaffleNumbers.count({
                where: {
                    raffleId: req.raffle.id,
                    status: 'apartado'
                }
            });

            // Agregar el contador al objeto raffle
            const raffleWithCount = {
                ...raffle.toJSON(),
                totalNumbers,
                numbersByStatus: {
                    available: availableNumbers,
                    sold: soldNumbers,
                    pending: pendingNumbers,
                    apartado: apartadoNumbers
                }
            };

            res.json(raffleWithCount)
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static createRaffle = async (req : Request, res : Response) => {
        const {name, nitResponsable, nameResponsable, description, startDate, playDate, price, banerImgUrl, quantity = 1000, banerMovileImgUrl} = req.body
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
                banerImgUrl,
                banerMovileImgUrl
            })

            if (req.user.dataValues.rol.dataValues.name === 'responsable') {
                const userRaffleExist = await UserRifa.findOne({
                    where: {
                        userId: req.user.id,
                        rifaId: raffle.id,
                    }
                })

                if (userRaffleExist) {
                    const error = new Error('Assignacion ya creada')
                    res.status(409).json({error: error.message})
                    return
                }

                const userRaffle = await UserRifa.create({
                    userId: req.user.id,
                    rifaId: raffle.id,
                    role: req.user.dataValues.rol.dataValues.name
                })
            }

            const numbers = Array.from({ length: quantity }, (_, i) => ({
                raffleId: raffle.id,
                number: i,
                paymentDue: price
            }));
            
            
            await RaffleNumbers.bulkCreate(numbers);

            // Buscar o crear el método de pago "Efectivo"
            let efectivoPayMethod = await PayMethode.findOne({
                where: {
                    name: 'efectivo'
                }
            });

            if (!efectivoPayMethod) {
                efectivoPayMethod = await PayMethode.create({
                    name: 'efectivo',
                    isActive: true
                });
            }

            // Buscar o crear el método de pago "Apartado"
            let apartadoPayMethod = await PayMethode.findOne({
                where: {
                    name: 'apartado'
                }
            });

            if (!apartadoPayMethod) {
                apartadoPayMethod = await PayMethode.create({
                    name: 'apartado',
                    isActive: true
                });
            }

            // Crear las asignaciones de los métodos de pago a la rifa
            await RafflePayMethode.bulkCreate([
                {
                    raffleId: raffle.id,
                    payMethodeId: efectivoPayMethod.id,
                    isActive: true,
                },
                {
                    raffleId: raffle.id,
                    payMethodeId: apartadoPayMethod.id,
                    isActive: true,
                }
            ]);

            res.status(201).send('Rifa creada correctamente')
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    } 


    static shareUrlRaffleShort = async (req: Request, res: Response) => {
        try {

            const token = jwt.sign(
                {
                    raffleId: req.raffle.id,
                    scope: "raffle:share",
                },
                process.env.JWT_SECRET as string,
                { expiresIn: "120d" }
            );

            const slug = slugify(req.raffle.dataValues.name, {
                lower: true,
                strict: true,  
            });

            const randomNum = Math.floor(10000 + Math.random() * 90000); 

            const identifier = `${slug}-${randomNum}`;

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 120);

            await SharedLink.create({
                uuid: identifier, 
                token,
                expiresAt,
            });

            const url = `${process.env.FRONTEND_URL}/raffle/shared/${identifier}`;

            res.json({ url });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Hubo un error generando la URL" });
        }
    };


    static updateRaffle = async (req : Request, res : Response) => {
        const {name, description, banerImgUrl, nitResponsable, nameResponsable, startDate, playDate, editDate, banerMovileImgUrl} = req.body
        try {
            await req.raffle.update({
                name,
                description,
                banerImgUrl,
                nitResponsable,
                nameResponsable,
                startDate,
                playDate,
                editDate,
                banerMovileImgUrl
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
        console.log('test inicio 2');
        try {

            const totalVendido = await RaffleNumbers.sum('paymentAmount', {
                where: {
                    raffleId: req.raffle.id ,
                    paymentAmount: {
                        [Op.gt]: 0, 
                    },
                },
            });

            const TotalCobrar = await RaffleNumbers.sum('paymentDue', {
                where: {
                    raffleId: req.raffle.id ,
                    status: 'pending'
                },
            });

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

            

            const totalAmount : number = raffleNumbers.reduce((total, raffle) => {
                const raffleTotal = raffle.dataValues.payments.reduce((sum, payment) => sum + parseFloat(payment.dataValues.amount.toString()), 0) || 0
                return total + raffleTotal;
            }, 0);

            console.log('test inicio 2 -finalizado');



            res.status(200).json({
                totalRecaudado : totalAmount | 0,
                totalVendido: totalVendido | 0,
                TotalCancelPays: totalAmount - totalVendido | 0,
                TotalCobrar: TotalCobrar | 0
            })

        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static getRecaudoByVendedor = async (req: Request, res: Response) => {
        try {
            // Total recaudado
            const raffleNumbersTotalRecaudado = await RaffleNumbers.findAll({
                where: {
                    raffleId: req.raffle.id
                },
                include: [
                    {
                        model: Payment,
                        as: 'payments',
                        attributes: ['amount'],
                        where: {
                            amount: { [Op.gt]: 0 },
                            userId: req.user.id
                        },
                        required: true
                    }
                ]
            });
    
            // Total de rifas
            const totalRaffleNumberSold = await RaffleNumbers.count({
                distinct: true,
                where: {
                    raffleId: req.raffle.id,
                    status: 'sold'
                },
                include: [
                    {
                        model: Payment,
                        as: 'payments',
                        where: {
                            // amount: { [Op.gt]: 0 },
                            userId: req.user.id,
                            isValid: true
                        },
                        required: true
                    }
                ]
            });
            const totalRaffleNumberAmount = await RaffleNumbers.count({
                distinct: true,
                where: {
                    raffleId: req.raffle.id,
                    status: 'pending'
                },
                include: [
                    {
                        model: Payment,
                        as: 'payments',
                        where: {
                            // amount: { [Op.gt]: 0 },
                            userId: req.user.id,
                            isValid: true
                        },
                        required: true
                    }
                ]
            });
    
            // Total cancelado
            const raffleNumbersTotalCancelado = await RaffleNumbers.findAll({
                where: {
                    raffleId: req.raffle.id
                },
                attributes: [],
                include: [
                    {
                        model: Payment,
                        as: 'payments',
                        attributes: ['amount'],
                        where: {
                            amount: { [Op.gt]: 0 },
                            userId: req.user.id,
                            isValid: false
                        },
                        required: true
                    }
                ]
            });


            const totalRecaudado: number = raffleNumbersTotalRecaudado.reduce((total, raffle) => {
                const raffleTotal = raffle.dataValues.payments.reduce((sum, payment) => sum + parseFloat(payment.dataValues.amount.toString()), 0) || 0;
                return total + raffleTotal;
            }, 0);
    
            const totalCancelado: number = raffleNumbersTotalCancelado.reduce((total, raffle) => {
                const raffleTotal = raffle.dataValues.payments.reduce((sum, payment) => sum + parseFloat(payment.dataValues.amount.toString()), 0) || 0;
                return total + raffleTotal;
            }, 0);
    
            // Total a cobrar
            const raffleNumberTotalCobrar = await RaffleNumbers.findAll({
                where: {
                    raffleId: req.raffle.id,
                    status: 'pending'
                },
                attributes: ['paymentDue'],
                include: [
                    {
                        model: Payment,
                        as: 'payments',
                        attributes: [],
                        where: {
                            // amount: { [Op.gt]: 0 },
                            userId: req.user.id,
                            isValid: true
                        },
                        required: true
                    }
                ]
            });
    
            const totalCobrar: number = raffleNumberTotalCobrar.reduce((total, raffle) => {
                const raffleTotal = +raffle.dataValues.paymentDue || 0;
                return total + raffleTotal;
            }, 0);

            
    
            res.status(200).json({
                totalRecaudado: totalRecaudado | 0,
                totalCancelado: totalCancelado | 0,
                totalRaffleNumber: [totalRaffleNumberSold, totalRaffleNumberAmount],
                totalCobrar: totalCobrar | 0
            });
    
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Hubo un Error' });
        }
    };
    

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

            if (req.user.dataValues.rol.dataValues.name === "responsable") {
                const asignacionExist = await UserRifa.findOne({
                    where: {
                        userId: req.user.id,
                        rifaId: req.raffle.id,
                    },
                });

                if (!asignacionExist) {
                    res.status(403).json({
                        error: "No tienes permiso para realizar esta acción",
                    });
                    return
                }
            }


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