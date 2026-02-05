import { Request, Response } from 'express';
import { Op, literal } from 'sequelize';
import Payment from '../models/payment';
import RaffleNumbers from '../models/raffle_numbers';
import Rol from '../models/rol';
import User from '../models/user';
import { amountRaffleNumberSchema, amountRaffleNumberSharedSchema, raffleNumbersIdsShema, sellRaffleNumbersSchema, updateRaffleNumber } from '../middlewares/validateRaffle';
import RafflePayMethode from '../models/rafflePayMethode';
import PayMethode from '../models/payMethode';
import RaffleOffer from '../models/raffleOffers';
import Clients from '../models/clients';
import Purchase from '../models/purchase';

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
        const {search, amount, available, sold, pending, page = 1, limit = 100,} = req.query

        const pageNumber = parseInt(page as string);
        const limitNumber = parseInt(limit as string);
        const offset = (pageNumber - 1) * limitNumber;
        

        try {

            const filter : any = {}

            filter.raffleId = req.raffle.id

            filter.status = 'available'

            // if (available && !sold && !pending) {
            //     filter.status = 'available'
            // }
            // if (!available && sold && !pending) {
            //     filter.status = 'sold'
            // }
            // if (!available && !sold && pending) {
            //     filter.status = 'pending'
            // }


            if (search) {
                filter.number = { [Op.eq]: +search };
            }

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
        const {search, amount, available, sold, apartado, pending, page = 1, limit = 100, paymentMethod, startDate, endDate, userId} = req.query

        const pageNumber = parseInt(page as string);
        const limitNumber = parseInt(limit as string);
        const offset = (pageNumber - 1) * limitNumber;

        try {

            const filter : any = {}

            let rafflePayMethodeExits = null;

            // Solo validar el método de pago si se proporciona
            if (paymentMethod) {
                rafflePayMethodeExits = await RafflePayMethode.findOne({
                    where: {
                        id: paymentMethod,
                        raffleId: req.raffle.id
                    }
                });
                
                if (!rafflePayMethodeExits) {
                    res.status(400).json({ error: 'El método de pago no es válido para esta rifa.' });
                    return;
                }
            }

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

            // Si existe paymentMethod y no hay otros filtros de estado, excluir disponibles
            if (paymentMethod && !available && !sold && !pending) {
                filter.status = { [Op.ne]: 'available' };
            }

            filter.raffleId = req.raffle.id

            if (search) {
                const searchConditions = [];
                
                // Si search es numérico, buscar por número
                if (!isNaN(Number(search))) {
                    searchConditions.push({ number: { [Op.eq]: +search } });
                }
                
                // Siempre buscar por teléfono
                searchConditions.push({ phone: { [Op.like]: `%${search}%` } });
                searchConditions.push({ firstName: { [Op.like]: `%${search}%` } });
                searchConditions.push({ lastName: { [Op.like]: `%${search}%` } });
                filter[Op.or] = searchConditions;
            }

            // Filtro por monto/deuda (paymentDue)
            if (amount && !isNaN(Number(amount))) {
                filter.paymentAmount = { [Op.lte]: Number(amount) };
            }

            // Configurar include para payments con filtro de paymentMethod y/o fechas
            const paymentInclude: any = {
                model: Payment,
                as: 'payments',
                attributes: ['userId', 'createdAt','isValid'], 
                separate: true, 
                order: [['createdAt', 'ASC']],
            };

            // Configurar filtros para payments
            const paymentWhere: any = {};

            // Si se especifica paymentMethod, filtrar por método de pago
            if (paymentMethod && rafflePayMethodeExits) {
                paymentWhere.paymentMethodId = rafflePayMethodeExits.id;
                paymentWhere.isValid = true;
            }

            // Si se especifican ambas fechas, filtrar por rango de fechas
            if (startDate && endDate) {
                const startDateFormatted = `${startDate} 00:00:00`;
                const endDateFormatted = `${endDate} 23:59:59`;
                
                paymentWhere.createdAt = {
                    [Op.between]: [startDateFormatted, endDateFormatted]
                };
            }

            // si se especifica userId, filtrar por usuario
            if (userId) {
                const userExist = await User.findByPk(userId as string);
                if (userExist) {
                    paymentWhere.userId = userId;
                    paymentWhere.isValid = true;
                }
            }

            // Si hay filtros de payments, aplicarlos
            if (Object.keys(paymentWhere).length > 0) {
                paymentInclude.where = paymentWhere;
                paymentInclude.required = true;
                paymentInclude.separate = false; // Cambiar a false para que funcione el required
            }

            const {count, rows :  raffleNumbers } = await RaffleNumbers.findAndCountAll({
                where: filter,
                attributes: ['id', 'number', 'status', 'firstName',  'lastName'],
                include: [paymentInclude],
                limit: limitNumber,
                offset,
                order: [['number', 'ASC']],
                distinct: true, // Evitar duplicados cuando hay múltiples pagos
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
        const {search, amount, available, sold, pending, paymentMethod, apartado,  startDate, endDate, userId} = req.query
        // console.log('exelfiilter', paymentMethod);
        
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

            let rafflePayMethodeExits = null;
            if (paymentMethod) {
                rafflePayMethodeExits = await RafflePayMethode.findOne({
                    where: {
                        id: paymentMethod,
                        raffleId: req.raffle.id
                    }
                });
                
                if (!rafflePayMethodeExits) {
                    res.status(400).json({ error: 'El método de pago no es válido para esta rifa.' });
                    return;
                }
            }

            // Si existe paymentMethod y no hay otros filtros de estado, excluir disponibles
            if (rafflePayMethodeExits && !available && !sold && !pending) {
                filter.status = { [Op.ne]: 'available' };
            }

            filter.raffleId = req.raffle.id

            if (search) {
                const searchConditions = [];
                
                // Si search es numérico, buscar por número
                if (!isNaN(Number(search))) {
                    searchConditions.push({ number: { [Op.eq]: +search } });
                }
                
                // Siempre buscar por identificationNumber
                searchConditions.push({ identificationNumber: { [Op.eq]: search } });
                
                filter[Op.or] = searchConditions;
            }

            // Filtro por monto/deuda (paymentDue)
            if (amount && !isNaN(Number(amount))) {
                filter.paymentAmount = { [Op.lte]: Number(amount) };
            }

            // Configurar include para payments con filtro de paymentMethod y/o fechas
            const includeOptions: any[] = [
            ];
            
            // Configurar filtros para payments
            const paymentWhere: any = {};

            // Si se especifica paymentMethod, filtrar por método de pago
            if (rafflePayMethodeExits) {
                paymentWhere.paymentMethodId = rafflePayMethodeExits.id;
                paymentWhere.isValid = true;
            }

            // Si se especifican ambas fechas, filtrar por rango de fechas
            if (startDate && endDate) {
                const startDateFormatted = `${startDate} 00:00:00`;
                const endDateFormatted = `${endDate} 23:59:59`;
                
                paymentWhere.createdAt = {
                    [Op.between]: [startDateFormatted, endDateFormatted]
                };
            }

            // si se especifica userId, filtrar por usuario
            if (userId) {
                const userExist = await User.findByPk(userId as string);
                if (userExist) {
                    paymentWhere.userId = userId;
                    paymentWhere.isValid = true;
                }
            }

            // paymentWhere.isValid == true

            

            // Si hay filtros de payments, aplicarlos
            if (Object.keys(paymentWhere).length > 0) {
                includeOptions.push({
                    model: Payment,
                    as: 'payments',
                    attributes: ['id','amount', 'createdAt', 'isValid'], // Incluir valores para sumatorias
                    where: { 
                        ...paymentWhere,
                        isValid: true
                    },
                });
            }


            // Siempre incluir el filtro de pagos válidos
            const finalPaymentWhere = {
                ...paymentWhere,
                isValid: true
            };

            const {count, rows :  raffleNumbers } = await RaffleNumbers.findAndCountAll({
                where: filter,
                attributes: ['id', 'number', 'status', 'paymentAmount', 'paymentDue', 'phone', 'firstName', 'lastName'],
                include: [
                    {
                        model: Payment,
                        required: !!rafflePayMethodeExits || (!!startDate && !!endDate) || !!userId,
                        as: 'payments',
                        attributes: ['id','amount', 'createdAt', 'isValid', 'reference'], // Incluir reference
                        include: [
                            {
                                model: RafflePayMethode,
                                as: 'rafflePayMethode',
                                attributes: ['id', 'accountNumber', 'accountHolder', 'bankName'],
                                include: [
                                    {
                                        model: PayMethode,
                                        as: 'payMethode',
                                        attributes: ['name', 'id', 'isActive']
                                    }
                                ]
                            }
                        ],
                        where: finalPaymentWhere, // Usar el filtro que siempre incluye isValid: true
                        // required: Object.keys(paymentWhere).length > 0,
                        separate: false // Cambiar a false para que funcione el required
                    }
                ],
                order: [['number', 'ASC']],
                
                distinct: true // Evitar duplicados cuando hay filtro de método de pago
            })
            // console.log('getRaffleNumbersForExelFilter', raffleNumbers.map(rn => rn.payments));
            

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

    static getRaffleNumbersPendingSell = async (req:Request, res: Response) => {
        const parsed = raffleNumbersIdsShema.safeParse(req.query)
        try {
            if (!parsed.success) {
                res.status(400).json({ error: parsed.error })
                return
            }

            const { raffleNumbersIds } = parsed.data

            const raffleNumbers = await RaffleNumbers.findAll({
                attributes: ['id', 'number', 'status', 'paymentDue', 'paymentAmount', 'firstName', 'lastName', 'phone', 'address'],
                where: {
                    id: {
                        [Op.in]: raffleNumbersIds
                    },
                    // status: 'pending'
                }
            })

            // Validar que el número de IDs enviados coincida con los números encontrados
            if (raffleNumbers.length !== raffleNumbersIds.length) {
                res.status(400).json({ 
                    error: ` Algunos números no existen o no están en estado pendiente.`
                })
                return
            }

            // Validar que todos los números tengan los mismos datos
            if (raffleNumbers.length > 1) {
                const firstNumber = raffleNumbers[0];
                const firstData = {
                    status: firstNumber.status,
                    firstName: firstNumber.firstName,
                    lastName: firstNumber.lastName,
                    phone: firstNumber.phone,
                    address: firstNumber.address
                };

                for (let i = 1; i < raffleNumbers.length; i++) {
                    const currentNumber = raffleNumbers[i];
                    const currentData = {
                        status: currentNumber.status,
                        firstName: currentNumber.firstName,
                        lastName: currentNumber.lastName,
                        phone: currentNumber.phone,
                        address: currentNumber.address
                    };

                    // Comparar cada campo
                    if (JSON.stringify(firstData) !== JSON.stringify(currentData)) {
                        res.status(400).json({ 
                            error: `Los números de rifa no tienen datos consistentes. El número ${currentNumber.number} tiene datos diferentes al primer número.`
                        })
                        return
                    }
                }
            }

            res.json(raffleNumbers)

        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static getRaffleNumbersForExel = async (req: Request, res: Response) => {
            try {
                let filter : any = {}
                filter.raffleId = req.raffle.id

                // Sin limitaciones: obtener todos los números de la rifa
                const { count, rows: raffleNumbers } = await RaffleNumbers.findAndCountAll({
                    where: filter,
                    attributes: ['id', 'number', 'status', 'reservedDate', 'firstName', 'lastName', 'phone', 'address', 'paymentAmount', 'paymentDue'],
                    include: [
                        {
                            model: Payment,
                            as: 'payments',
                            attributes: ['amount', 'isValid', 'createdAt', 'reference'],
                            include: [
                                {
                                    model: User,
                                    as: 'user',
                                    attributes: ['firstName', 'lastName', 'identificationNumber']
                                },
                                {
                                    model: RafflePayMethode,
                                    as: 'rafflePayMethode',
                                    attributes: ['id', 'accountNumber', 'accountHolder', 'bankName'],
                                    include: [
                                        {
                                            model: PayMethode,
                                            as: 'payMethode',
                                            attributes: ['name', 'id', 'isActive']
                                        }
                                    ]
                                }
                            ],
                            order: [['createdAt', 'ASC']],
                            separate: true,
                        }
                    ],
                    order: [['number', 'ASC']],
                });

                // Mantener la estructura de respuesta para el frontend
                res.json({
                    total: count,
                    raffleNumbers,
                    totalPages: 1,
                    currentPage: 1,
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
                            },
                            {
                                model: RafflePayMethode,
                                as: 'rafflePayMethode',
                                attributes: ['id', 'accountNumber', 'accountHolder', 'bankName'],
                                include: [
                                    {
                                        model: PayMethode,
                                        as: 'payMethode',
                                        attributes: ['name', 'id', 'isActive']
                                    }
                                ]
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
        
        const parsed = sellRaffleNumbersSchema.safeParse(req.body)

        if (!parsed.success) {
            res.status(400).json({ error: 'Datos inválidos' })
            return
        }

        const {raffleNumbersIds, firstName, lastName, phone, address, amount, paymentMethod, reference} = parsed.data

        const referenceExist = await Payment.findOne({
            where: { reference }
        })

        if (referenceExist) {
            const error = new Error('Referencia de pago ya usada');
            res.status(409).json({error: error.message});
            return
        }

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

            // Buscar y validar todos los números de rifa primero
            const raffleNumbers = await RaffleNumbers.findAll({
                where: {
                    id: raffleNumbersIds,
                    raffleId: req.raffle.id
                },
                attributes: ['id', 'number', 'status', 'paymentDue', 'paymentAmount']
            });

            // Validar que se encontraron todos los números
            if (raffleNumbers.length !== raffleNumbersIds.length) {
                res.status(400).json({ 
                    error: `Se encontraron ${raffleNumbers.length} números de rifa, pero se enviaron ${raffleNumbersIds.length} IDs. Algunos números no existen.`
                });
                return
            }
            // Validar el estado de los números - Abonar varios números pendientes o apartados (no mezclados)
            const allPending = raffleNumbers.every(num => num.dataValues.status === 'pending') ||
                raffleNumbers.every(num => num.dataValues.status === 'apartado');

            // Verificar que el método de pago exista y pertenezca a la rifa
            const paymentMethodExiste = await RafflePayMethode.findOne({
                where: {
                    id: paymentMethod,
                    raffleId: req.raffle.id
                }
            });

            if (!paymentMethodExiste) {
                res.status(400).json({ error: 'El método de pago no es válido para esta rifa.' });
                return;
            }

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

            // Buscar o crear el método de pago "Apartado" en la rifa
            let apartadoPayMethod = await RafflePayMethode.findOne({
                where: {
                    raffleId: req.raffle.id
                },
                include: [{
                    model: PayMethode,
                    as: 'payMethode',
                    where: {
                        name: 'apartado'
                    }
                }]
            });

            if (!apartadoPayMethod) {
                // Buscar el PayMethode de apartado
                let payMethodeApartado = await PayMethode.findOne({
                    where: {
                        name: 'apartado'
                    }
                });

                if (!payMethodeApartado) {
                    payMethodeApartado = await PayMethode.create({
                        name: 'apartado',
                        isActive: true
                    });
                }

                // Crear el RafflePayMethode para apartado
                apartadoPayMethod = await RafflePayMethode.create({
                    raffleId: req.raffle.id,
                    payMethodeId: payMethodeApartado.id,
                    accountNumber: '',
                    accountHolder: 'Sistema',
                    bankName: 'Apartado',
                    isActive: true
                });
            }

            // Si todos los números son pendientes, procesar distribución equitativa y terminar
            if (allPending) {
                const totalPaymentDue = raffleNumbers.reduce((sum, num) => sum + (num.dataValues.paymentDue || 0), 0);

                if ((amount <= 0) || amount > totalPaymentDue ) {
                    const error = new Error('El valor ingresado debe ser mayor a cero y no puede exceder la deuda total.');
                    res.status(422).json({ error: error.message });
                    return;
                }

                // Verificar si todas las deudas son iguales
                const firstDebt = Number(raffleNumbers[0].dataValues.paymentDue) || 0;
                const allDebtsEqual = raffleNumbers.every(num => 
                    Math.abs((Number(num.dataValues.paymentDue) || 0) - firstDebt) < 0.01
                );

                if (allDebtsEqual) {

                    // Distribución equitativa del abono entre todos los números pendientes
                    const baseAmount = Math.floor((amount * 100) / raffleNumbers.length) / 100; // Cantidad base por número
                    const remainderCents = Math.round((amount - (baseAmount * raffleNumbers.length)) * 100); // Centavos restantes

                    // Crear pagos con distribución equitativa
                    const distributedPayments = raffleNumbers.map((raffleNumber, index) => {
                        let distributedAmount = baseAmount;
                        // Distribuir centavos restantes en los primeros números
                        if (index < remainderCents) {
                            distributedAmount += 0.01;
                        }
                        
                        return {
                            riffleNumberId: raffleNumber.id,
                            amount: distributedAmount,
                            paidAt: fechaActual,
                            userId: req.user.id,
                            paymentMethodId: paymentMethodExiste.id,
                            reference: reference || null
                        };
                    });
    
                    // Crear todos los pagos distribuidos
                    await Payment.bulkCreate(distributedPayments);
    
                    // Actualizar cada número con su abono correspondiente
                    for (let index = 0; index < raffleNumbers.length; index++) {
                        const raffleNumber = raffleNumbers[index];
                        let distributedAmount = baseAmount;
                        if (index < remainderCents) {
                            distributedAmount += 0.01;
                        }
    
                        const currentPaymentAmount = Number(raffleNumber.dataValues.paymentAmount) || 0;
                        const currentPaymentDue = Number(raffleNumber.dataValues.paymentDue) || 0;
                        
                        const newPaymentAmount = Math.round((currentPaymentAmount + distributedAmount) * 100) / 100;
                        const newPaymentDue = Math.round((currentPaymentDue - distributedAmount) * 100) / 100;
    
                        // Si se completa el pago, marcar como vendido
                        const status = newPaymentDue <= 0 ? 'sold' : 'pending';
    
                        await RaffleNumbers.update(
                            {
                                paymentAmount: newPaymentAmount,
                                paymentDue: Math.max(0, newPaymentDue),
                                status: status
                            },
                            {
                                where: { id: raffleNumber.id }
                            }
                        );
                    }
                } else {
                    // Distribución por llenado secuencial - pagar deudas menores primero
                    
                    // Crear array con índices y deudas, ordenado por deuda ascendente
                    const debtInfo = raffleNumbers.map((num, index) => ({
                        index,
                        debt: Number(num.dataValues.paymentDue) || 0,
                        raffleNumber: num
                    })).sort((a, b) => a.debt - b.debt);

                    let remainingAmount = amount;
                    const distributedAmounts = new Array(raffleNumbers.length).fill(0);

                    // Procesar cada grupo de deudas iguales
                    let currentDebtGroup = [];
                    let currentDebt = -1;

                    for (let i = 0; i < debtInfo.length; i++) {
                        const info = debtInfo[i];
                        
                        // Si es una nueva deuda, procesar el grupo anterior
                        if (info.debt !== currentDebt) {
                            // Procesar grupo anterior si existe
                            if (currentDebtGroup.length > 0 && remainingAmount > 0) {
                                const groupDebt = currentDebtGroup[0].debt;
                                const totalNeededForGroup = groupDebt * currentDebtGroup.length;
                                
                                if (remainingAmount >= totalNeededForGroup) {
                                    // Pagar completamente todo el grupo
                                    currentDebtGroup.forEach(item => {
                                        distributedAmounts[item.index] = groupDebt;
                                    });
                                    remainingAmount -= totalNeededForGroup;
                                } else {
                                    // Distribuir lo que queda equitativamente entre el grupo
                                    const baseAmountPerNumber = Math.floor((remainingAmount * 100) / currentDebtGroup.length) / 100;
                                    const remainderCents = Math.round((remainingAmount - (baseAmountPerNumber * currentDebtGroup.length)) * 100);
                                    
                                    currentDebtGroup.forEach((item, groupIndex) => {
                                        let amountForThisNumber = baseAmountPerNumber;
                                        if (groupIndex < remainderCents) {
                                            amountForThisNumber += 0.01;
                                        }
                                        distributedAmounts[item.index] = amountForThisNumber;
                                    });
                                    remainingAmount = 0;
                                }
                            }
                            
                            // Iniciar nuevo grupo
                            currentDebtGroup = [info];
                            currentDebt = info.debt;
                        } else {
                            // Agregar al grupo actual
                            currentDebtGroup.push(info);
                        }
                    }

                    // Procesar el último grupo
                    if (currentDebtGroup.length > 0 && remainingAmount > 0) {
                        const groupDebt = currentDebtGroup[0].debt;
                        const totalNeededForGroup = groupDebt * currentDebtGroup.length;
                        
                        if (remainingAmount >= totalNeededForGroup) {
                            // Pagar completamente todo el grupo
                            currentDebtGroup.forEach(item => {
                                distributedAmounts[item.index] = groupDebt;
                            });
                            remainingAmount -= totalNeededForGroup;
                        } else {
                            // Distribuir lo que queda equitativamente entre el grupo
                            const baseAmountPerNumber = Math.floor((remainingAmount * 100) / currentDebtGroup.length) / 100;
                            const remainderCents = Math.round((remainingAmount - (baseAmountPerNumber * currentDebtGroup.length)) * 100);
                            
                            currentDebtGroup.forEach((item, groupIndex) => {
                                let amountForThisNumber = baseAmountPerNumber;
                                if (groupIndex < remainderCents) {
                                    amountForThisNumber += 0.01;
                                }
                                distributedAmounts[item.index] = amountForThisNumber;
                            });
                            remainingAmount = 0;
                        }
                    }

                    // Crear pagos con distribución calculada - validar que todos los montos sean válidos
                    const distributedPayments = raffleNumbers.map((raffleNumber, index) => {
                        const distributedAmount = distributedAmounts[index];
                        
                        // Validar que el monto sea un número válido y positivo
                        const validAmount = isFinite(distributedAmount) && !isNaN(distributedAmount) && distributedAmount >= 0 
                            ? distributedAmount 
                            : 0;

                        return {
                            riffleNumberId: raffleNumber.id,
                            amount: validAmount,
                            paidAt: fechaActual,
                            userId: req.user.id,
                            paymentMethodId: paymentMethodExiste.id,
                            reference: reference || null
                        };
                    });

                    // Crear todos los pagos distribuidos
                    await Payment.bulkCreate(distributedPayments);

                    // Actualizar cada número con su abono correspondiente
                    for (let index = 0; index < raffleNumbers.length; index++) {
                        const raffleNumber = raffleNumbers[index];
                        const distributedAmount = distributedAmounts[index];

                        // Validar que el monto distribuido sea válido
                        const validDistributedAmount = isFinite(distributedAmount) && !isNaN(distributedAmount) && distributedAmount >= 0 
                            ? distributedAmount 
                            : 0;

                        const currentPaymentAmount = Number(raffleNumber.dataValues.paymentAmount) || 0;
                        const currentPaymentDue = Number(raffleNumber.dataValues.paymentDue) || 0;
                        
                        const newPaymentAmount = Math.round((currentPaymentAmount + validDistributedAmount) * 100) / 100;
                        const newPaymentDue = Math.round((currentPaymentDue - validDistributedAmount) * 100) / 100;

                        // Validar que los nuevos valores sean números válidos
                        const validNewPaymentAmount = isFinite(newPaymentAmount) && !isNaN(newPaymentAmount) ? newPaymentAmount : currentPaymentAmount;
                        const validNewPaymentDue = isFinite(newPaymentDue) && !isNaN(newPaymentDue) ? Math.max(0, newPaymentDue) : currentPaymentDue;

                        // Si se completa el pago, marcar como vendido
                        const status = validNewPaymentDue <= 0 ? 'sold' : 'pending';

                        await RaffleNumbers.update(
                            {
                                paymentAmount: validNewPaymentAmount,
                                paymentDue: validNewPaymentDue,
                                status: status
                            },
                            {
                                where: { id: raffleNumber.id }
                            }
                        );
                    }
                }


                // Obtener los números actualizados
                const updatedRaffleNumbers = await RaffleNumbers.findAll({
                    where: { id: raffleNumbers.map(num => num.id) },
                    include: [
                        {
                            model: Payment,
                            as: 'payments', 
                            include: [
                                {
                                    model: User,
                                    as: 'user',
                                    // attributes: ['firstName','lastName', 'identificationNumber']
                                },
                                {
                                    model: RafflePayMethode,
                                    as: 'rafflePayMethode',
                                    // attributes: ['id', 'accountNumber', 'accountHolder', 'bankName'],
                                    include: [
                                        {
                                            model: PayMethode,
                                            as: 'payMethode',
                                            // attributes: ['name', 'id']
                                        }
                                    ]
                                }
                            ],
                        },
                    ],
                });

                req.app.get('io').emit('sellNumbers', {
                    raffleId: req.raffle.id
                }); 

                res.json(updatedRaffleNumbers);
                return; // Terminar aquí para números pendientes
            }

            // Crear datos de pagos usando los IDs validados (solo para números NO pendientes)
            const paymentsData = raffleNumbers.map((raffleNumber) => ({
                riffleNumberId: raffleNumber.id,
                amount: separar ? 0 : (descuento ? amount : req.raffle.dataValues.price),
                paidAt: separar ? undefined : fechaActual,
                userId: req.user.id,
                paymentMethodId: separar ? ( descuento ? paymentMethodExiste.id : apartadoPayMethod.id) : paymentMethodExiste.id,
                reference: separar ? undefined : (reference || null)
            }));

            // Crear todos los pagos en lote
            await Payment.bulkCreate(paymentsData);

            // Actualizar todos los números en lote según el modo
            if (!separar) {
                // Modo compra - marcar como vendidos
                await RaffleNumbers.update(
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
                            id: raffleNumbers.map(num => num.id)
                        }
                    }
                );
            } else {
                // Modo separar - marcar como pendientes
                await RaffleNumbers.update(
                    {
                        paymentAmount: 0,
                        paymentDue: descuento ? amount : req.raffle.dataValues.price,
                        status: 'pending',
                        reservedDate: fechaActual,
                        firstName,
                        lastName,
                        phone,
                        address
                    },
                    {
                        where: {
                            id: raffleNumbers.map(num => num.id)
                        }
                    }
                );
            }

            // Obtener los números actualizados con sus pagos
            const updatedRaffleNumbers = await RaffleNumbers.findAll({
                where: { id: raffleNumbers.map(num => num.id) },
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

            res.json(updatedRaffleNumbers); 


        } catch (error) {
            console.log(error)
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static amountRaffleNumber = async (req: Request, res: Response) => {

        const parsed = amountRaffleNumberSchema.safeParse(req.body);

        if (!parsed.success) {
            res.status(400).json({ error: parsed.error });
            return;
        }

        const { firstName, lastName, phone, address, amount, paymentMethod, reference} = parsed.data
        
        const {descuento} = req.query

        const fechaActual: Date = new Date();

        const referenceExist = await Payment.findOne({
            where: { reference }
        })

        if (referenceExist) {
            const error = new Error('Referencia de pago ya se uso');
            res.status(409).json({error: error.message});
            return
        }

        const raffleNumberPrice = req.raffleNumber.paymentAmount - req.raffleNumber.paymentDue

        try {
            if (fechaActual > new Date(req.raffle.dataValues.editDate)) {
                const error = new Error('Fuera del rango de fechas permitido');
                res.status(400).json({error: error.message});
                return
            }


                    if (amount > req.raffle.dataValues.price) {
                        const error = new Error('El valor ingresado excede el precio permitido para esta rifa.');
                        res.status(422).json({ error: error.message });
                        return;
                    }

                    if (amount > raffleNumberPrice) {
                        const error = new Error('El valor ingresado excede el precio permitido para esta rifa.');
                        res.status(422).json({ error: error.message });
                        return;
                    }
            
            // Verificar que el método de pago exista
            const paymentMethodExiste = await RafflePayMethode.findByPk(paymentMethod)

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

            // Buscar o crear el método de pago "Apartado" en PayMethode
            let payMethodeApartado = await PayMethode.findOne({
                where: {
                    name: 'apartado'
                }
            });

            if (!payMethodeApartado) {
                payMethodeApartado = await PayMethode.create({
                    name: 'apartado',
                    isActive: true
                });
            }

            // Buscar o crear el RafflePayMethode para "Apartado" en esta rifa específica
            let apartadoRafflePayMethod = await RafflePayMethode.findOne({
                where: {
                    raffleId: req.raffle.id
                },
                include: [{
                    model: PayMethode,
                    as: 'payMethode',
                    where: {
                        name: 'apartado'
                    }
                }]
            });

            if (!apartadoRafflePayMethod) {
                // Crear el RafflePayMethode para apartado
                apartadoRafflePayMethod = await RafflePayMethode.create({
                    raffleId: req.raffle.id,
                    payMethodeId: payMethodeApartado.id,
                    accountNumber: '',
                    accountHolder: 'Sistema',
                    bankName: 'Apartado',
                    isActive: true
                });
            }

            const raffleNumbersStatus = req.raffleNumber.dataValues.status
            const currentPaymentAmount = +req.raffleNumber.dataValues.paymentAmount
            const currentPaymentDue = +req.raffleNumber.dataValues.paymentDue

            if (raffleNumbersStatus === 'sold') {
                const error = new Error('Rifa ya vendida');
                res.status(400).json({error: error.message});
                return
            }

            if (raffleNumbersStatus === 'pending') {

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

                    let isDifferentSeller = false;
                    
                    isDifferentSeller = existingPayments.some(payment => 
                        payment.dataValues.user &&
                        payment.dataValues.user.id !== req.user.id &&
                        payment.dataValues.user.dataValues.rol &&
                        payment.dataValues.user.dataValues.rol.dataValues.name === 'vendedor'
                    );


                    if (isDifferentSeller && req.user.dataValues.rol.dataValues.name === 'vendedor') {
                        res.status(403).json({ error: "No puedes realizar un abono iniciado por otro vendedor." });
                        return;
                    }
                    
                    
                    const payment = await Payment.create({
                        riffleNumberId: req.raffleNumber.id,
                        amount: amount,
                        paidAt: fechaActual,
                        userId: req.user.id,
                        paymentMethodId: paymentMethodExiste.id,
                        reference: reference || null
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
                        userId: req.user.id,
                        paymentMethodId: paymentMethodExiste.id,
                        reference: reference || null
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
                                    // attributes: ['firstName','lastName', 'identificationNumber']
                                },
                                {
                                    model: RafflePayMethode,
                                    as: 'rafflePayMethode',
                                    // attributes: ['id', 'accountNumber', 'accountHolder', 'bankName'],
                                    include: [
                                        {
                                            model: PayMethode,
                                            as: 'payMethode',
                                            // attributes: ['name', 'id']
                                        }
                                    ]
                                }
                            ],
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

                const amountZero = amount === 0 
                const amountCompleto = amount === currentPaymentDue
                // const currentPaymentAmount = +req.raffleNumber.dataValues.paymentAmount
                // const currentPaymentDue = +req.raffleNumber.dataValues.paymentDue

                if (amountCompleto && !descuento) {
                    const payment = await Payment.create({
                        riffleNumberId: req.raffleNumber.id,
                        amount: amount,
                        paidAt: fechaActual,
                        userId: req.user.id,
                        paymentMethodId: paymentMethodExiste.id,
                        reference: reference || null
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
                        userId: req.user.id,
                        paymentMethodId: amountZero ? apartadoRafflePayMethod.id : paymentMethodExiste.id,
                        reference: amountZero ? null : reference || null
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
                        userId: req.user.id,
                        paymentMethodId: apartadoRafflePayMethod.id,
                        reference: reference || null
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

    static acceptRaffleNumberShared = async (req: Request, res: Response) => {
        try {

            // Validar fechas
            const fechaActual = new Date();
            const editDate = new Date(req.raffle.dataValues.editDate);
            const playDate = new Date(req.raffle.dataValues.playDate);
            if (fechaActual > editDate || fechaActual > playDate) {
                res.status(400).json({ error: 'No se puede aceptar el número fuera del rango de fechas permitido.' });
                return;
            }

            const raffeNumberStatus = req.raffleNumber.dataValues.status;
            if (raffeNumberStatus && raffeNumberStatus !== 'apartado') {
                res.status(400).json({ error: 'El número de rifa no está en estado apartado' });
                return;
            }

            // Buscar el Payment válido (isValid true) asociado a este número, incluyendo método de pago
            const payment = await Payment.findOne({
                where: {
                    riffleNumberId: req.raffleNumber.id,
                    isValid: true
                },
                include: [{
                    model: RafflePayMethode,
                    as: 'rafflePayMethode',
                    include: [{
                        model: PayMethode,
                        as: 'payMethode',
                    }]
                }]
            });

            let reference = null;
            let paymentMethodId = null;
            let payMethodeName = '';
            if (payment) {
                reference = payment.dataValues.reference;
                paymentMethodId = payment.dataValues.paymentMethodId;
                if (payment.dataValues.rafflePayMethode && payment.dataValues.rafflePayMethode.dataValues.payMethode) {
                    payMethodeName = payment.dataValues.rafflePayMethode.dataValues.payMethode.dataValues.name;
                }
                // Eliminar (invalidar) el payment anterior
                await payment.update({ isValid: false, reference: null});
            }

            // Lógica según el método de pago
            const reservedDate = req.raffleNumber.reservedDate || new Date();
            const deuda = Number(req.raffleNumber.dataValues.paymentDue) || 0;
            const abono = Number(req.raffleNumber.dataValues.paymentAmount) || 0;
            const total = abono + deuda;

            if (payMethodeName && payMethodeName.toLowerCase() === 'apartado') {
                // Si es apartado, dejar el número en pending, abonos y deudas igual, payment amount igual o 0, paidAt null, método de pago 'apartado'
                await Payment.create({
                    riffleNumberId: req.raffleNumber.id,
                    amount: abono,
                    paidAt: null,
                    userId: req.user.id,
                    paymentMethodId: paymentMethodId,
                    reference: reference,
                    isValid: true
                });
                await req.raffleNumber.update({
                    status: 'pending',
                    paymentDue: deuda,
                    paymentAmount: abono
                });
            } else {
                // Si es otro método de pago, pagar el número completo y marcar como vendido
                await Payment.create({
                    riffleNumberId: req.raffleNumber.id,
                    amount: deuda,
                    paidAt: reservedDate,
                    userId: req.user.id,
                    paymentMethodId: paymentMethodId,
                    reference: reference,
                    isValid: true
                });
                await req.raffleNumber.update({
                    status: 'sold',
                    paymentDue: 0,
                    paymentAmount: total
                });
            }

            res.send('Número de rifa aceptado correctamente.');

        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error en la aceptación del número'});
        }
    }

    static rejectRaffleNumberShared = async (req: Request, res: Response) => {
        try {
            // Validar fechas
            const fechaActual = new Date();
            const editDate = new Date(req.raffle.dataValues.editDate);
            const playDate = new Date(req.raffle.dataValues.playDate);
            if (fechaActual > editDate || fechaActual > playDate) {
                res.status(400).json({ error: 'No se puede aceptar el número fuera del rango de fechas permitido.' });
                return;
            }

            const raffeNumberStatus = req.raffleNumber.dataValues.status;
            if (raffeNumberStatus && raffeNumberStatus !== 'apartado') {
                res.status(400).json({ error: 'El número de rifa no está en estado apartado' });
                return;
            }

            
            // Buscar todos los pagos válidos (isValid true) asociados a este número
            const payments = await Payment.findAll({
                where: {
                    riffleNumberId: req.raffleNumber.id,
                    isValid: true
                },
            });

            // Actualizar todos los pagos encontrados a isValid: false
            for (const payment of payments) {
                await payment.update({ isValid: false });
            }

            await req.raffleNumber.update({
                status: 'available',
                paymentDue: req.raffle.dataValues.price,
                paymentAmount: 0,
                firstName: null,
                lastName: null,
                phone: null,
                address: null,
                reservedDate: null,
                clienteId: null,
                purchaseId: null
            });

            res.send('Número de rifa rechazado');

        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error en la aceptación del número'});
        }
    }
    
    static amountRaffleNumberShared = async (req: Request, res: Response) => {

        const parsed = amountRaffleNumberSharedSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: 'Datos Invalidos' });
            return;
        }

        const { firstName, lastName, phone, address, amount, paymentMethod, reference, raffleNumbersIds} = parsed.data;

        if (phone) {
            req.client = await Clients.findOne({ where: { phone } });
        }

        if (!req.client) {
            req.client = await Clients.create({ firstName, lastName, phone, address });
        }

        const referenceExist = await Payment.findOne({
            where: { reference }
        })

        if (referenceExist) {
            const error = new Error('Referencia de pago ya existe');
            res.status(409).json({error: error.message});
            return
        }

        const fechaActual: Date = new Date();

        try {

            if (fechaActual > new Date(req.raffle.dataValues.editDate)) {
                const error = new Error("Fuera del rango de fechas permitido");
                res.status(400).json({ error: error.message });
                return;
            }

            if (amount !== 0) {
                const error = new Error("El valor debe ser 0 para apartar números.");
                res.status(422).json({ error: error.message });
                return;
            }

            // Validar que el array de IDs no esté vacío
            if (!Array.isArray(raffleNumbersIds) || raffleNumbersIds.length === 0) {
                const error = new Error("Debe seleccionar al menos un número para apartar");
                res.status(400).json({ error: error.message });
                return;
            }

            // Validar que el método de pago exista
            const paymentMethodExiste = await RafflePayMethode.findByPk(paymentMethod);
            if (!paymentMethodExiste) {
                const error = new Error("Método de pago no encontrado");
                res.status(404).json({ error: error.message });
                return;
            }

            // // Buscar o crear el método de pago "Apartado"
            // let apartadoPayMethod = await PayMethode.findOne({
            //     where: {
            //         name: 'apartado'
            //     }
            // });

            // if (!apartadoPayMethod) {
            //     apartadoPayMethod = await PayMethode.create({
            //         name: 'apartado',
            //         isActive: true
            //     });
            // }

            // Buscar y validar todos los números de rifa
            const raffleNumbers = await RaffleNumbers.findAll({
                where: {
                    id: raffleNumbersIds,
                    raffleId: req.raffle.id
                },
                attributes: ['id', 'number', 'status']
            });

            // Validar que se encontraron todos los números solicitados
            if (raffleNumbers.length !== raffleNumbersIds.length) {
                const foundIds = raffleNumbers.map(rn => rn.id);
                const missingIds = raffleNumbersIds.filter(id => !foundIds.includes(id));
                const error = new Error(`Los siguientes números no existen o no pertenecen a esta rifa: ${missingIds.join(', ')}`);
                res.status(404).json({ error: error.message });
                return;
            }

            // Validar que todos los números estén disponibles
            const unavailableNumbers = raffleNumbers.filter(rn => rn.dataValues.status !== 'available');
            if (unavailableNumbers.length > 0) {
                const unavailableNumbersList = unavailableNumbers.map(rn => rn.dataValues.number).join(', ');
                const error = new Error(`Los siguientes números no están disponibles para apartar: ${unavailableNumbersList}`);
                res.status(400).json({ error: error.message });
                return;
            }

            const offers = await RaffleOffer.findAll({
                where: { 
                    raffleId: req.raffle.id,
                    isActive: true
                },
                order: [['minQuantity', 'ASC']]
            })

            let unitPrice = req.raffle.dataValues.price;

            for (const offer of offers) {
                if (raffleNumbersIds.length >= offer.dataValues.minQuantity) {
                    // console.log('paso--------');
                    
                    unitPrice = parseFloat(offer.dataValues.discountedPrice);
                    break;
                }
            }

            // console.log('deuda final-----', unitPrice);
            // console.log('ofertas final-----', offers);
            

            // Crear datos de pagos para todos los números (pagos de apartado)
            // Para usuarios no registrados (proceso compartido), userId será null
            const paymentsData = raffleNumbers.map((raffleNumber) => ({
                riffleNumberId: raffleNumber.id,
                amount: 0,
                userId: null, // null para usuarios no registrados
                paymentMethodId: paymentMethodExiste.id,
                reference: reference || null,
                paymentDue: unitPrice,
            }));

            // Crear todos los pagos de apartado en lote
            await Payment.bulkCreate(paymentsData);

            const purchase = await Purchase.create({
                raffleId: req.raffle.id,
                clientId: req.client.id,
                userId: null, // null para usuarios no registrados
                source: 'shared_link',
                sharedLinkId: null
            })

            // Actualizar todos los números a estado "apartado"
            await RaffleNumbers.update(
                {
                    status: "apartado", 
                    reservedDate: fechaActual,
                    firstName: req.client.dataValues.firstName,
                    lastName: req.client.dataValues.lastName,
                    phone: req.client.dataValues.phone,
                    address: req.client.dataValues.address,
                    paymentAmount: 0, 
                    paymentDue: unitPrice, 
                    purchaseId: purchase.id,
                    clienteId: req.client.id
                },
                {
                    where: {
                        id: raffleNumbersIds
                    }
                }
            );



            // Obtener los números actualizados con sus pagos
            const updatedRaffleNumbers = await RaffleNumbers.findAll({
                where: { id: raffleNumbersIds },
                include: [
                        {
                            model: Payment,
                            as: 'payments', 
                            include: [
                                {
                                    model: User,
                                    as: 'user',
                                    // attributes: ['firstName','lastName', 'identificationNumber']
                                },
                                {
                                    model: RafflePayMethode,
                                    as: 'rafflePayMethode',
                                    // attributes: ['id', 'accountNumber', 'accountHolder', 'bankName'],
                                    include: [
                                        {
                                            model: PayMethode,
                                            as: 'payMethode',
                                            // attributes: ['name', 'id']
                                        }
                                    ]
                                }
                            ],
                        },
                    ],
                order: [['number', 'ASC']]
            });

            // Emitir evento de actualización
            req.app.get("io").emit("sellNumbers", {
                raffleId: req.raffle.id,
            });

            res.json(updatedRaffleNumbers);

        } catch (error) {
            console.log(error);
            res.status(500).json({ error: "Hubo un Error" });
        }
    };


    static updateRaffleNumber = async (req: Request, res: Response) => {

        const parsed = updateRaffleNumber.safeParse(req.body);
        
        if (!parsed.success) {
            res.status(400).json({ error: 'Datos Invalidos' });
            return 
        }

        const { phone, address, firstName, lastName} = parsed.data;
        try {

            const existingPayment = await Payment.findOne({
                where: { riffleNumberId: req.raffleNumber.id },
                order: [['createdAt', 'ASC']], 
            });
        
            if (existingPayment && existingPayment.dataValues.userId !== req.user.id) {
                res.status(403).json({ error: "No puedes actualizar el numero apartado por otro usuario." });
                return
            }

            const userExist = await User.findOne({
                where: {
                    phone
                }
            })

            if (userExist) {
                await req.raffleNumber.update({
                    phone: userExist.dataValues.phone,
                    address: userExist.dataValues.address,
                    firstName: userExist.dataValues.firstName,
                    lastName: userExist.dataValues.lastName
                })
            } else {
                await req.raffleNumber.update({
                    phone,
                    address,
                    firstName,
                    lastName
                })
            }

            res.send('Datos actualizados correctamente')
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

            const isApartadoDelete = req.raffleNumber.dataValues.status === 'apartado' && req.user.dataValues.rol.dataValues.name != 'vendedor'
        
            if (existingPayment && existingPayment.dataValues.userId !== req.user.id && !isApartadoDelete) {
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

    static getRandomAvailableNumberShared = async (req: Request, res: Response) => {
        try {

            const count = await RaffleNumbers.count({
            where: { raffleId: req.raffle.id, status: 'available' }
            });

            const randomIndex = Math.floor(Math.random() * count);

            const randomNumber = await RaffleNumbers.findOne({
                where: { raffleId: req.raffle.id, status: 'available' },
                attributes: ['id', 'number', 'status'],
                offset: randomIndex,
            });

            console.log(randomNumber)

            if (!randomNumber) {
                res.json({error: 'Números aleatorios no disponibles'})
                return
            }

            res.json(randomNumber);

        } catch (error) {
            console.log(error);
            res.status(500).json({ error: "Error al obtener número aleatorio" });
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