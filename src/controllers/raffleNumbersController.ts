import { Request, Response } from 'express';
import Payment from '../models/payment';
import RaffleNumbers from '../models/raffle_numbers';
import User from '../models/user';
import { Op } from 'sequelize';


class raffleNumbersControllers {

    static getRaffleNumbers = async (req: Request, res: Response) => {
        const {search, available, sold, pending, page = 1, limit = 100} = req.query

        const pageNumber = parseInt(page as string);
        const limitNumber = parseInt(limit as string);
        const offset = (pageNumber - 1) * limitNumber;

        try {

            const filter : any = {}

            if (available && !sold && !pending) {
                filter.status = 'available'
            }
            if (!available && sold && !pending) {
                filter.status = 'sold'
            }
            if (!available && !sold && pending) {
                filter.status = 'pending'
            }

            filter.raffleId = req.raffle.id

            if (search) {
                filter[Op.or] = [
                    // { firstName: { [Op.like]: `%${search}%` } }, 
                    // { lastName: { [Op.like]: `%${search}%` } },  
                    { identificationNumber:  { [Op.eq]: search }},
                    // { phone: { [Op.eq]: search }}, 
                    { number: { [Op.eq]: +search } }, 
                ];
            }

            const {count, rows :  raffleNumbers } = await RaffleNumbers.findAndCountAll({
                where: filter,
                attributes: ['id', 'number', 'status'],
                limit: limitNumber,
                offset,
                order: [['number', 'ASC']],
            })

            res.json({
                total: count,
                raffleNumbers,
                totalPages: Math.ceil(count / limitNumber),
                currentPage: pageNumber,
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static getRaffleNumbersForExel = async (req: Request, res: Response) => {
        const { page = 1, limit = 1000} = req.query

        const pageNumber = parseInt(page as string);
        const limitNumber = parseInt(limit as string);
        const offset = (pageNumber - 1) * limitNumber;
        try {

            let filter : any = {}

            filter.raffleId = req.raffle.id

            const {count, rows :  raffleNumbers } = await RaffleNumbers.findAndCountAll({
                where: filter,
                attributes: ['id', 'number', 'status', 'reservedDate', 'identificationType', 'identificationNumber', 'firstName', 'lastName', 'phone', 'address', 'paymentAmount', 'paymentDue'],
                include: [
                    {
                        model: Payment,
                        as : 'payments',
                        attributes: ['amount']
                    }
                ],
                limit: limitNumber,
                offset,
                order: [['number', 'ASC']],
            })

            res.json({
                total: count,
                raffleNumbers,
                totalPages: Math.ceil(count / limitNumber),
                currentPage: pageNumber,
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static getRaffleNumberById = async (req: Request, res: Response) => {
        try {

            const raffleNumber = await RaffleNumbers.findByPk(req.raffleNumber.id,{
                include: [
                    {
                        model: Payment,
                        as: 'payments', 
                        include: [
                            {
                                model: User,
                                as: 'user',
                                attributes: ['firstName','lastName', 'identificationNumber']
                            }
                        ]
                    },
                ],
            })
            res.json(raffleNumber)
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static sellRaffleNumbers = async (req: Request, res: Response) => {
        const {raffleNumbersIds, identificationType, identificationNumber, firstName, lastName, phone, address} = req.body
        const fechaActual: Date = new Date();
        try {
            if (fechaActual > new Date(req.raffle.dataValues.editDate)) {
                const error = new Error('Fuera del rango de fechas permitido');
                res.status(400).json({error: error.message});
                return
            }

            const paymentsData = raffleNumbersIds.map((_, index: number) => ({
                riffleNumberId: raffleNumbersIds[index],
                amount: req.raffle.dataValues.price,
                paidAt: fechaActual,
                userId: req.user.id
            }));

            const payments = await Payment.bulkCreate(paymentsData);

            const [affectedRows, updatedInstances] = await RaffleNumbers.update(
                {
                    paymentAmount: req.raffle.dataValues.price,
                    paymentDue: 0,
                    status: 'sold',
                    reservedDate: fechaActual,
                    identificationType,
                    identificationNumber,
                    firstName,
                    lastName,
                    phone,
                    address
                },
                {
                    where: {
                        id: raffleNumbersIds, 
                    },
                    returning: true
                }
                
            );

            const raffleNumber = await RaffleNumbers.findAll({
                where: { id: raffleNumbersIds },
                include: [
                    {
                        model: Payment,
                        as: 'payments', 
                        include: [
                            {
                                model: User,
                                as: 'user',
                                attributes: ['firstName','lastName', 'identificationNumber']
                            }
                        ]
                    },
                ],
            });

            req.app.get('io').emit('sellNumbers', {
                raffleId: req.raffle.id
            }); 

            res.json(raffleNumber)
        } catch (error) {
            console.log(error)
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static amountRaffleNumber = async (req: Request, res: Response) => {
        const {identificationType, identificationNumber, firstName, lastName, phone, address, amount} = req.body
        const fechaActual: Date = new Date();
        try {
            if (fechaActual > new Date(req.raffle.dataValues.editDate)) {
                const error = new Error('Fuera del rango de fechas permitido');
                res.status(400).json({error: error.message});
                return
            }

            if (amount > req.raffle.dataValues.price ) {
                const error = new Error('El valor ingresado excede el precio permitido para esta rifa.');
                res.status(422).json({error: error.message})
                return
            }

            const raffleNumbersStatus = req.raffleNumber.dataValues.status

            if (raffleNumbersStatus === 'sold') {
                const error = new Error('Rifa ya vendida');
                res.status(400).json({error: error.message});
                return
            }

            if (raffleNumbersStatus === 'pending') {

                const currentPaymentAmount = +req.raffleNumber.dataValues.paymentAmount
                const currentPaymentDue = +req.raffleNumber.dataValues.paymentDue


                if (amount > currentPaymentDue) {
                    const error = new Error('El valor ingresado excede el valor de la deuda.');
                    res.status(422).json({error: error.message})
                    return
                }

                const amountCompleto = amount === currentPaymentDue

                if (amountCompleto) { // termina abono
                    const existingPayment = await Payment.findOne({
                        where: { 
                            riffleNumberId: req.raffleNumber.id,
                            isValid: true
                        },
                        order: [['createdAt', 'DESC']], 
                    });
                
                    if (existingPayment && existingPayment.dataValues.userId !== req.user.id && req.user.dataValues.rol.dataValues.name === 'vendedor' ) {
                        res.status(403).json({ error: "No puedes realizar un abono iniciado por otro usuario." });
                        return
                    }
                    const payment = await Payment.create({
                        riffleNumberId: req.raffleNumber.id,
                        amount: amount,
                        paidAt: fechaActual,
                        userId: req.user.id
                    })

                    await req.raffleNumber.update({
                        paymentAmount: currentPaymentAmount + amount,
                        paymentDue: currentPaymentDue - amount,
                        status: 'sold',
                    })
                } else { // continuar abono
                    const existingPayment = await Payment.findOne({
                        where: { 
                            riffleNumberId: req.raffleNumber.id,
                            isValid: true
                        },
                        order: [['createdAt', 'DESC']], 
                    });
                
                    if (existingPayment && existingPayment.dataValues.userId !== req.user.id && req.user.dataValues.rol.dataValues.name === 'vendedor') {
                        res.status(403).json({ error: "No puedes realizar un abono iniciado por otro usuario." });
                        return
                    }
                    
                    const payment = await Payment.create({
                        riffleNumberId: req.raffleNumber.id,
                        amount: amount,
                        userId: req.user.id
                    })

                    await req.raffleNumber.update({
                        paymentAmount: currentPaymentAmount + amount,
                        paymentDue: currentPaymentDue - amount,
                    })
                }

                const raffleNumber = await RaffleNumbers.findOne({
                    where: {
                        id: req.raffleNumber.id
                    },
                    include: [
                        {
                            model: Payment,
                            as : 'payments',
                            include: [
                                {
                                    model: User,
                                    as: 'user',
                                    attributes: ['firstName','lastName', 'identificationNumber']
                                }
                            ]
                        }
                    ]
                })
                res.json([raffleNumber])
                req.app.get('io').emit('sellNumbers', {
                    raffleId: req.raffle.id
                }); 
                return
            }

            if (raffleNumbersStatus === 'available') {

                const amountCompleto = amount === +req.raffle.dataValues.price
                const currentPaymentAmount = +req.raffleNumber.dataValues.paymentAmount
                const currentPaymentDue = +req.raffleNumber.dataValues.paymentDue

                if (amountCompleto) {
                    const payment = await Payment.create({
                        riffleNumberId: req.raffleNumber.id,
                        amount: amount,
                        paidAt: fechaActual,
                        userId: req.user.id
                    })

                    await req.raffleNumber.update({
                        paymentAmount: currentPaymentAmount + amount,
                        paymentDue: currentPaymentDue - amount,
                        status: 'sold',
                        reservedDate: fechaActual,
                        identificationType,
                        identificationNumber,
                        firstName,
                        lastName,
                        phone,
                        address
                    })
                } else { // Abono
                    const payment = await Payment.create({
                        riffleNumberId: req.raffleNumber.id,
                        amount: amount,
                        userId: req.user.id
                    })
                    

                    await req.raffleNumber.update({
                        paymentAmount: currentPaymentAmount + amount,
                        paymentDue: currentPaymentDue - amount,
                        status: 'pending',
                        reservedDate: fechaActual,
                        identificationType,
                        identificationNumber,
                        firstName,
                        lastName,
                        phone,
                        address
                    })
                }
                
                const raffleNumber = await RaffleNumbers.findOne({
                    where: {
                        id: req.raffleNumber.id
                    },
                    include: [
                        {
                            model: Payment,
                            as : 'payments',
                            include: [
                                {
                                    model: User,
                                    as: 'user',
                                    attributes: ['firstName','lastName', 'identificationNumber']
                                }
                            ]
                        }
                    ]
                })
                res.json([raffleNumber])
                req.app.get('io').emit('sellNumbers', {
                    raffleId: req.raffle.id
                }); 
                return
            }
            
            if (!req.raffleNumber) {
                const error = new Error('Numero de rifa no encontrado');
                res.json({error: error.message})
                return
            }

        } catch (error) {
            console.log(error)
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static updateRaffleNumber = async (req: Request, res: Response) => {
        const { phone, address} = req.body
        try {

            const existingPayment = await Payment.findOne({
                where: { riffleNumberId: req.raffleNumber.id },
                order: [['createdAt', 'ASC']], 
            });
        
            if (existingPayment && existingPayment.dataValues.userId !== req.user.id) {
                res.status(403).json({ error: "No puedes actualizar el numero apartado por otro usuario." });
                return
            }
            await req.raffleNumber.update({
                phone,
                address
            })

            res.send('Numero de rifa actualizada correctamnete')
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static deleteClientRaffleNumber = async (req: Request, res: Response) => {
        try {

            const existingPayment = await Payment.findOne({
                where: { riffleNumberId: req.raffleNumber.id },
                order: [['createdAt', 'DESC']], 
            });
        
            if (existingPayment && existingPayment.dataValues.userId !== req.user.id) {
                res.status(403).json({ error: "No puedes eliminar un numero reservado por otro usuario." });
                return
            }
            
            await req.raffleNumber.update({
                status: 'available',
                reservedDate: null,
                phone: null,
                address : null,
                identificationType: null,
                identificationNumber: null,
                firstName: null,
                lastName: null,
                paymentAmount: 0,
                paymentDue: req.raffle.dataValues.price
            })

            await Payment.update(
                {isValid: false},
                {where : {
                    riffleNumberId: req.raffleNumber.id
                }},
            )
            req.app.get('io').emit('sellNumbers', {
                raffleId: req.raffle.id
            }); 

            res.send('Rifa restablecida correctamente')
        } catch (error) {
            console.log(error);
        }
    }
}

export default raffleNumbersControllers