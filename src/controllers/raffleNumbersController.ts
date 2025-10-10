import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Payment from '../models/payment';
import RaffleNumbers from '../models/raffle_numbers';
import Rol from '../models/rol';
import User from '../models/user';

export function formatPostgresDateToReadable(dateString: string): string {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        throw new Error('Invalid date format');
    }
    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
    };
    return date.toLocaleDateString('es-UY', options);
}

class raffleNumbersControllers {

    static getRaffleNumbersShared = async (req: Request, res: Response) => {
        const {search, amount, available, sold, pending, page = 1, limit = 100} = req.query

        const pageNumber = parseInt(page as string);
        const limitNumber = parseInt(limit as string);
        const offset = (pageNumber - 1) * limitNumber;

        try {

            const filter : any = {}

            filter.raffleId = req.raffle.id

            // if (available && !sold && !pending) {
            //     filter.status = 'available'
            // }
            // if (!available && sold && !pending) {
            //     filter.status = 'sold'
            // }
            // if (!available && !sold && pending) {
            //     filter.status = 'pending'
            // }


            // if (search) {
            //     filter[Op.or] = [
            //         { identificationNumber:  { [Op.eq]: search }},
            //         { number: { [Op.eq]: +search } }, 
            //     ];
            // }

            // // Filtro por monto/deuda (paymentDue)
            // if (amount && !isNaN(Number(amount))) {
            //     filter.paymentAmount = { [Op.lte]: Number(amount) };
            // }

            const {count, rows :  raffleNumbers } = await RaffleNumbers.findAndCountAll({
                where: filter,
                attributes: ['id', 'number', 'status'],
                include: [
                    {
                        model: Payment,
                        as: 'payments',
                        attributes: ['userId', 'createdAt'], 
                        separate: true, 
                        order: [['createdAt', 'ASC']], 
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

    static getRaffleNumbers = async (req: Request, res: Response) => {
        const {search, amount, available, sold, apartado, pending, page = 1, limit = 100} = req.query

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
            if (!available && !sold && !pending && apartado) {
                filter.status = 'apartado'
            }

            filter.raffleId = req.raffle.id

            if (search) {
                filter[Op.or] = [
                    { number: { [Op.eq]: +search } }, 
                    { phone: { [Op.like]: `%${search}%` } }
                ];
            }

            // Filtro por monto/deuda (paymentDue)
            if (amount && !isNaN(Number(amount))) {
                filter.paymentAmount = { [Op.lte]: Number(amount) };
            }

            const {count, rows :  raffleNumbers } = await RaffleNumbers.findAndCountAll({
                where: filter,
                attributes: ['id', 'number', 'status'],
                include: [
                    {
                        model: Payment,
                        as: 'payments',
                        attributes: ['userId', 'createdAt'], 
                        separate: true, 
                        order: [['createdAt', 'ASC']], 
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
    
    static getRaffleNumbersForExelFilter = async (req: Request, res: Response) => {
        const {search, amount, available, sold, pending} = req.query

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
                    { identificationNumber:  { [Op.eq]: search }},
                    { number: { [Op.eq]: +search } }, 
                ];
            }

            // Filtro por monto/deuda (paymentDue)
            if (amount && !isNaN(Number(amount))) {
                filter.paymentAmount = { [Op.lte]: Number(amount) };
            }

            const {count, rows :  raffleNumbers } = await RaffleNumbers.findAndCountAll({
                where: filter,
                attributes: ['id', 'number', 'status', 'paymentAmount', 'paymentDue', 'phone', 'firstName', 'lastName'],
                order: [['number', 'ASC']],
            })

            res.json({
                userName: req.user.dataValues.firstName,
                userLastName: req.user.dataValues.lastName,
                rafflePrice: req.raffle.dataValues.price,
                raffleNumbers,
                count
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

            const { count, rows: raffleNumbers } = await RaffleNumbers.findAndCountAll({
                where: filter,
                attributes: ['id', 'number', 'status', 'reservedDate', 'firstName', 'lastName', 'phone', 'address', 'paymentAmount', 'paymentDue'],
                include: [
                    {
                        model: Payment,
                        as: 'payments',
                        attributes: ['amount', 'isValid', 'createdAt'], // Asegúrate de incluir el campo de fecha
                        include: [
                            {
                                model: User,
                                as: 'user',
                                attributes: ['firstName', 'lastName', 'identificationNumber']
                            }
                        ],
                        order: [['createdAt', 'ASC']], // Orden por fecha ascendente (más vieja al inicio)
                        separate: true, // Hace la consulta separada solo para los pagos
                    }
                ],
                limit: limitNumber,
                offset,
                order: [['number', 'ASC']],
            });
            

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

    static getRaffleNumberByIdShared = async (req: Request, res: Response) => {
        try {
            res.json(req.raffleNumber)
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static sellRaffleNumbers = async (req: Request, res: Response) => {
        const {raffleNumbersIds, firstName, lastName, phone, address, amount} = req.body
        const {separar, descuento} = req.query
        const fechaActual: Date = new Date();
        try {

            if (descuento && (amount < 1 || amount === undefined)) {
                const error = new Error('El monto no puede ser 0 si se aplica descuento');
                res.status(400).json({error: error.message});
                return
            }

            if (!Array.isArray(raffleNumbersIds) || raffleNumbersIds.length === 0) {
                res.status(400).json({ error: 'Los IDs de las rifas son requeridos y deben ser un arreglo' });
                return 
            }


            if (fechaActual > new Date(req.raffle.dataValues.editDate)) {
                const error = new Error('Fuera del rango de fechas permitido');
                res.status(400).json({error: error.message});
                return
            }

            let paymentsData : any = [] 


            paymentsData = raffleNumbersIds.map((id) => ({
                riffleNumberId: id,
                amount: separar ? 0 : (descuento ? amount : req.raffle.dataValues.price),
                paidAt: separar ? undefined : fechaActual,
                userId: req.user.id
            }));


            const payments = await Payment.bulkCreate(paymentsData);

            if (!separar) {

                const [affectedRows, updatedInstances] = await RaffleNumbers.update(
                    {
                        paymentAmount: descuento ? amount : req.raffle.dataValues.price,
                        paymentDue: 0,
                        status: 'sold',
                        reservedDate: fechaActual,
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
            }else {
                const [affectedRows, updatedInstances] = await RaffleNumbers.update(
                    {
                        paymentAmount: 0,
                        paymentDue: descuento ? amount : 0,
                        status: 'pending',
                        reservedDate: fechaActual,
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
            }
            

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
        const { firstName, lastName, phone, address, amount} = req.body
        const {descuento} = req.query
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

                if (amount <= 0) {
                    const error = new Error('El valor debe ser mayor a cero.');
                    res.status(422).json({ error: error.message });
                    return;
                }                

                if (amount > currentPaymentDue) {
                    const error = new Error('El valor ingresado excede el valor de la deuda.');
                    res.status(422).json({error: error.message})
                    return
                }

                const amountCompleto = amount === currentPaymentDue

                if (amountCompleto) { // termina abono
                    const existingPayments = await Payment.findAll({
                        where: { 
                            riffleNumberId: req.raffleNumber.id,
                            isValid: true
                        },
                        include: [
                            {
                                model: User,
                                as: 'user',
                                attributes: ['id'],
                                include: [
                                    {
                                        model: Rol,
                                        as: 'rol',
                                    }
                                ]
                            }
                        ],
                        order: [['createdAt', 'DESC']], 
                    });
                    
                    const isDifferentSeller = existingPayments.some(payment => 
                        payment.dataValues.user.id !== req.user.id 
                        && payment.dataValues.user.dataValues.rol.dataValues.name === 'vendedor'
                    );


                    if (isDifferentSeller && req.user.dataValues.rol.dataValues.name === 'vendedor') {
                        res.status(403).json({ error: "No puedes realizar un abono iniciado por otro vendedor." });
                        return;
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

            if ((raffleNumbersStatus === 'available') || (raffleNumbersStatus === 'apartado')) {

                const amountCompleto = amount === +req.raffle.dataValues.price
                const currentPaymentAmount = +req.raffleNumber.dataValues.paymentAmount
                const currentPaymentDue = +req.raffleNumber.dataValues.paymentDue

                if (amountCompleto && !descuento) {
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
                        firstName,
                        lastName,
                        phone,
                        address
                    })
                } else if (!amountCompleto && !descuento) { // Abono
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
                        firstName,
                        lastName,
                        phone,
                        address
                    })
                } else if (descuento) {
                    const payment = await Payment.create({
                        riffleNumberId: req.raffleNumber.id,
                        amount: 0,
                        // paidAt: fechaActual,
                        userId: req.user.id
                    })

                    await req.raffleNumber.update({
                        paymentAmount: 0,
                        paymentDue: amount,
                        status: 'pending',
                        reservedDate: fechaActual,
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
    
    static amountRaffleNumberShared = async (req: Request, res: Response) => {
        const { firstName, lastName, phone, address, amount } = req.body;
        const fechaActual: Date = new Date();

        try {

            if (fechaActual > new Date(req.raffle.dataValues.editDate)) {
                const error = new Error("Fuera del rango de fechas permitido");
                res.status(400).json({ error: error.message });
                return;
            }

            if (amount !== 0) {
                const error = new Error("El valor debe ser 0 para apartar el número.");
                res.status(422).json({ error: error.message });
                return;
            }

            if (!req.raffleNumber) {
                const error = new Error("Número de rifa no encontrado");
                res.status(404).json({ error: error.message });
                return;
            }

            const raffleNumbersStatus = req.raffleNumber.dataValues.status;

            if (raffleNumbersStatus === "available") {
                await req.raffleNumber.update({
                    status: "apartado", 
                    reservedDate: fechaActual,
                    firstName,
                    lastName,
                    phone,
                    address,
                    paymentAmount: 0, 
                    paymentDue: req.raffle.dataValues.price, 
                });

                const raffleNumber = await RaffleNumbers.findOne({
                    where: { id: req.raffleNumber.id },
                    include: [
                        {
                            model: Payment,
                            as: "payments",
                            include: [
                                {
                                    model: User,
                                    as: "user",
                                    attributes: ["firstName", "lastName", "identificationNumber"],
                                },
                            ],
                        },
                    ],
                });

                res.json([raffleNumber]);
                req.app.get("io").emit("sellNumbers", {
                    raffleId: req.raffle.id,
                });

                return;
            }
            

            res.status(400).json({ error: "El número no está disponible para apartar." });
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: "Hubo un Error" });
        }
    };


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
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    // static cangeActivityRaffleNumber = async (req: Request, res: Response) => {
    //     try {
    //         req.raffleNumber.update({
    //             isActive: !req.raffleNumber.dataValues.isActive
    //         })
    //     } catch (error) {
    //         console.log(error);
    //         res.status(500).json({error: 'Hubo un Error'})
    //     }
    // }
}

export default raffleNumbersControllers