import { Request, Response } from 'express';
import { Op, Sequelize } from 'sequelize';
import { buyNumbersForClientSchema, clientSchema } from '../middlewares/validateClient';
import Clients from '../models/clients';
import Payment from '../models/payment';
import PayMethode from '../models/payMethode';
import Purchase from '../models/purchase';
import Raffle from '../models/raffle';
import RaffleNumbers from '../models/raffle_numbers';
import RafflePayMethode from '../models/rafflePayMethode';
import UserClients from '../models/user_clients';
import UserRifa from '../models/user_raffle';
import { clientOrderMap } from '../utils';

async function getVisibleRaffleIds(raffleIds: number[]) {
    if (raffleIds.length === 0) return [];

    const visibleRaffles = await Raffle.findAll({
        where: {
            id: { [Op.in]: raffleIds },
            visible: true
        },
        attributes: ['id']
    });

    return visibleRaffles.map((r) => r.id);
}

class clientsController {

    static async getClientsSharedLinkAll(req: Request, res: Response) {
        const { page = 1, limit = 15, search, startDate, endDate, filter } = req.query;

        const pageNumber = parseInt(page as string);
        const limitNumber = parseInt(limit as string);
        const offset = (pageNumber - 1) * limitNumber;
        // const orderValue = parseInt(order as string) || 1;
        // const orderClause = clientOrderMap[orderValue] || clientOrderMap[1];

        try {

            const userRifas = await UserClients.findAll({
                attributes: ['clientId'],
                where: { userId: req.user.id },
            })

            const clientsIds = userRifas.map((ur) => ur.dataValues.clientId ?? ur.dataValues.clientId);

            let clientsWhere: any = {};
            
            const rolName = req.user.dataValues.rol?.dataValues?.name || req.user.dataValues.rol?.name || req.user.rol?.name || '';
            const isAdmin = rolName === 'admin';
            const isResponsable = rolName === 'responsable';
            const isVendedor = rolName === 'vendedor';
            let userRaffleIds: number[] = [];
            if (isResponsable || isVendedor) {
                const userRifas = await UserRifa.findAll({
                    where: { userId: req.user.id },
                    attributes: ['rifaId']
                });
                userRaffleIds = userRifas.map((ur) => ur.rifaId ?? ur.dataValues.rifaId);
                // Si no tiene rifas asociadas, forzar que no retorne nada
                if (userRaffleIds.length === 0) {
                    res.json({ total: 0, clients: [], totalPages: 1, currentPage: pageNumber });
                    return;
                }
            }

            if (!isAdmin && userRaffleIds.length > 0) {
                userRaffleIds = await getVisibleRaffleIds(userRaffleIds);
                if (userRaffleIds.length === 0) {
                    res.json({ total: 0, clients: [], totalPages: 1, currentPage: pageNumber });
                    return;
                }
            }
            

            // Filtro de búsqueda
            if (search) {
                const searchConditions = [];
                searchConditions.push({ phone: { [Op.like]: `%${search}%` } });
                if (Op.iLike) {
                    searchConditions.push({ firstName: { [Op.iLike]: `%${search}%` } });
                    searchConditions.push({ lastName: { [Op.iLike]: `%${search}%` } });
                    searchConditions.push({ address: { [Op.iLike]: `%${search}%` } });
                } else {
                    const searchStr = typeof search === 'string' ? search.toLowerCase() : '';
                    searchConditions.push({ firstName: { [Op.like]: `%${searchStr}%` } });
                    searchConditions.push({ lastName: { [Op.like]: `%${searchStr}%` } });
                    searchConditions.push({ address: { [Op.like]: `%${searchStr}%` } });
                }
                clientsWhere[Op.or] = searchConditions;
            }

            // Filtro de números de rifa
            let raffleNumbersWhere: any = {};
            if (startDate && endDate) {
                raffleNumbersWhere.reservedDate = {
                    [Op.between]: [
                        new Date(startDate as string),
                        new Date(endDate as string)
                    ]
                };
            } else if (startDate) {
                raffleNumbersWhere.reservedDate = { [Op.gte]: new Date(startDate as string) };
            } else if (endDate) {
                raffleNumbersWhere.reservedDate = { [Op.lte]: new Date(endDate as string) };
            }

            // Filtro por estados de las rifas (status)
            let statusArray: string[] = [];
            if (filter) {
                // filter puede ser un string o un array de strings
                if (Array.isArray(filter)) {
                    statusArray = (filter as any[]).map(String);
                } else if (typeof filter === 'string') {
                    // Si viene como string separado por comas
                    statusArray = filter.split(',').map((s) => s.trim());
                }
                if (statusArray.length > 0) {
                    raffleNumbersWhere.status = { [Op.in]: statusArray };
                }
            }
            // if (userRaffleIds.length > 0) {
            //     raffleNumbersWhere.raffleId = { [Op.in]: userRaffleIds };
            // }

            // Solo clientes con al menos un número de rifa asociado al usuario o a sus rifas, y con purchase.source = 'shared_link' y (clienteId o raffleId del usuario)

            const purchases = await Purchase.findAll({
                where: {
                    source: 'shared_link',
                    ...(userRaffleIds.length > 0 ? { raffleId: { [Op.in]: userRaffleIds } } : {})
                },
                attributes: ['id', 'clientId']
            });
            const clientesPurchaseIds = [...clientsIds, ...purchases.map(p => p.dataValues.clientId)]

            clientsWhere.id = { [Op.in]: clientesPurchaseIds };

            const statusSql =
            statusArray.length > 0
                ? `AND rn.status IN (${statusArray.map(s => `'${s}'`).join(',')})`
                : '';


            const whereWithExists = {
                ...clientsWhere,
                [Op.and]: Sequelize.literal(`
                    EXISTS (
                        SELECT 1
                        FROM "raffle_numbers" rn
                        INNER JOIN "purchases" p ON p.id = rn."purchaseId"
                        INNER JOIN "raffles" r ON r.id = rn."raffleId"
                        WHERE rn."clienteId" = "Clients"."id"
                        AND p.source = 'shared_link'
                        ${!isAdmin ? 'AND r."visible" = true' : ''}
                        ${statusSql}
                        ${userRaffleIds.length > 0
                            ? `AND rn."raffleId" IN (${userRaffleIds.join(',')})`
                            : ''}
                    )
                `)
            };

            const count = await Clients.count({
                where: whereWithExists,
                distinct: true,
                col: 'id'
            });

            const clients = await Clients.findAll({
                subQuery: false,
                where: whereWithExists,
                limit: limitNumber,
                offset,
                include: [
                    {
                        model: RaffleNumbers,
                        as: 'raffleNumbers',
                        limit: 50,
                        separate: true,
                        where: {
                            ...raffleNumbersWhere,
                            ...(!isAdmin && userRaffleIds.length > 0 ? { raffleId: { [Op.in]: userRaffleIds } } : {}),
                            [Op.or]: [
                                { clienteId: { [Op.in]: clientesPurchaseIds } },
                                ...(userRaffleIds.length > 0 ? [{ raffleId: { [Op.in]: userRaffleIds } }] : [])
                            ]
                        },
                        attributes: [
                            'id',
                            'number',
                            'reservedDate',
                            'paymentAmount',
                            'paymentDue',
                            'status',
                            'clienteId',
                            'raffleId',
                            'purchaseId'
                        ],
                        include: [
                            {
                                model: Purchase,
                                as: 'purchase',
                                required: true,
                                attributes: ['id', 'source'],
                                where: {
                                    source: 'shared_link',
                                    // [Op.or]: [
                                    //     { clienteId: { [Op.in]: clientsIds } },
                                    //     ...(userRaffleIds.length > 0 ? [{ raffleId: { [Op.in]: userRaffleIds } }] : [])
                                    // ]
                                }
                            },
                            {
                                model: Raffle,
                                as: 'raffle',
                                attributes: ['id', 'name', 'playDate', 'price', 'color', 'description', 'nameResponsable'],
                                ...(!isAdmin ? { where: { visible: true }, required: true } : {})
                            }
                        ],
                        order: [['reservedDate', 'DESC']]
                    }
                ],
                order: [
                    [
                        Sequelize.literal(`(
                            SELECT MAX(rn."reservedDate")
                            FROM "raffle_numbers" rn
                            INNER JOIN "purchases" p ON p.id = rn."purchaseId"
                            WHERE rn."clienteId" = "Clients"."id"
                            AND p.source = 'shared_link'
                            ${statusSql}
                            ${userRaffleIds.length > 0
                                ? `AND rn."raffleId" IN (${userRaffleIds.join(',')})`
                                : ''}
                        )`),
                        'DESC'
                    ]
                ]
            });

            // Obtener el total de números por rifa
            const raffleIds: number[] = [];
            clients.forEach(client => {
                if (client.dataValues.raffleNumbers) {
                    client.dataValues.raffleNumbers.forEach(num => {
                        if (num.dataValues.raffleId && !raffleIds.includes(num.dataValues.raffleId)) {
                            raffleIds.push(num.dataValues.raffleId);
                        }
                    });
                }
            });

            let raffleTotals: Record<number, number> = {};
            if (raffleIds.length > 0) {
                const totals = await RaffleNumbers.findAll({
                    where: { raffleId: { [Op.in]: raffleIds } },
                    attributes: ['raffleId', [RaffleNumbers.sequelize.fn('COUNT', RaffleNumbers.sequelize.col('id')), 'totalNumbers']],
                    group: ['raffleId']
                });
                totals.forEach((row) => {
                    raffleTotals[row.dataValues.raffleId] = parseInt(row.dataValues.totalNumbers);
                });
            }

            // Inyectar el total en cada objeto de rifa dentro raffleNumbers
            clients.forEach(client => {
                if (client.dataValues.raffleNumbers) {
                    client.dataValues.raffleNumbers.forEach(num => {
                        if (num.dataValues.raffle && num.dataValues.raffleId && raffleTotals[num.dataValues.raffleId]) {
                            num.dataValues.raffle.dataValues.totalNumbers = raffleTotals[num.dataValues.raffleId];
                        }
                    });
                }
            });

            // Enriquecer cada número de rifa con su último pago válido y sus includes
            const enrichedClients = await Promise.all(clients.map(async (client) => {
                const clientObj = client.toJSON();
                if (clientObj.raffleNumbers && clientObj.raffleNumbers.length > 0) {
                    clientObj.raffleNumbers = await Promise.all(clientObj.raffleNumbers.map(async (rn) => {
                        const lastValidPayment = await Payment.findOne({
                            where: { riffleNumberId: rn.id, isValid: true },
                            attributes: ['id', 'amount', 'createdAt', 'reference', 'riffleNumberId', 'paidAt',],
                            order: [['createdAt', 'DESC']],
                            include: [
                                {
                                    model: RafflePayMethode,
                                    as: 'rafflePayMethode',
                                    attributes: ['id', 'accountNumber', 'accountHolder', 'bankName', 'isActive'],
                                    include: [
                                        {
                                            model: PayMethode,
                                            as: 'payMethode',
                                            attributes: ['id', 'name', 'icon', 'isActive']
                                        }
                                    ]
                                }
                            ]
                        });
                        return {
                            ...rn,
                            lastValidPayment
                        };
                    }));
                }
                return clientObj;
            }));

            res.json({
                total: count,
                clients: enrichedClients,
                totalPages: Math.ceil(count / limitNumber),
                currentPage: pageNumber
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Hubo un Error al obtener los Clientes' });
        }
    }

    // Ruta para exportar todos los clientes y sus datos completos (sin paginación)
    static async getAllClientsForExport(req: Request, res: Response) {

        const { search, order = 1, startDate, endDate, raffleId, semaforo } = req.query;
        const orderValue = parseInt(order as string) || 1;
        const orderClause = clientOrderMap[orderValue] || clientOrderMap[1];
        const raffleIdNumber = Number(raffleId);
        const hasRaffleFilter = Number.isInteger(raffleIdNumber) && raffleIdNumber > 0;
        const hasSemaforoFilter = typeof semaforo === 'string' && ['blue', 'green', 'orange', 'red'].includes(semaforo);

        try {
            let clientsWhere: any = {};
            const rolName = req.user.dataValues.rol.dataValues.name;
            const isAdmin = rolName === 'admin';
            const isResponsable = rolName === 'responsable';
            const isVendedor = rolName === 'vendedor';
            let scopedRaffleIds: number[] | null = null;

            let clientIds: number[] = [];
            if (isAdmin) {
                // Admin: ve todos los clientes
            } else if (isResponsable) {
                // Responsable: solo ve clientes con números en SUS propias rifas
                const userRaffles = await UserRifa.findAll({
                    where: { userId: req.user.id },
                    attributes: ['rifaId']
                });
                const raffleIds = userRaffles
                    .map((ur) => ur.dataValues.rifaId)
                    .filter((id) => Number.isInteger(id) && id > 0);

                if (raffleIds.length === 0) {
                    res.json({ clients: [] });
                    return;
                }

                scopedRaffleIds = raffleIds;

                const raffleNumbers = await RaffleNumbers.findAll({
                    where: {
                        raffleId: { [Op.in]: raffleIds },
                        clienteId: { [Op.not]: null }
                    },
                    attributes: [['clienteId', 'clientId']],
                    raw: true,
                    group: ['clienteId']
                });
                clientIds = raffleNumbers
                    .map(rn => (rn as any).clientId)
                    .filter((id) => Number.isInteger(id) && id > 0);

                if (clientIds.length === 0) {
                    res.json({ clients: [] });
                    return;
                }
                clientsWhere.id = { [Op.in]: clientIds };
            } else if (isVendedor) {
                // Vendedor: solo ve clientes con números en las rifas de su responsable creador.
                const createdBy = req.user.dataValues.createdBy;
                if (!createdBy) {
                    res.json({ clients: [] });
                    return;
                }

                const creatorRaffles = await UserRifa.findAll({
                    where: { userId: createdBy },
                    attributes: ['rifaId']
                });
                scopedRaffleIds = creatorRaffles
                    .map((ur) => ur.dataValues.rifaId)
                    .filter((id) => Number.isInteger(id) && id > 0);

                if (scopedRaffleIds.length === 0) {
                    res.json({ clients: [] });
                    return;
                }

                const creatorRaffleNumbers = await RaffleNumbers.findAll({
                    where: {
                        raffleId: { [Op.in]: scopedRaffleIds },
                        clienteId: { [Op.not]: null },
                        status: { [Op.not]: 'available' }
                    },
                    attributes: [['clienteId', 'clientId']],
                    raw: true,
                    group: ['clienteId']
                });

                clientIds = creatorRaffleNumbers
                    .map((rn) => Number((rn as any).clientId))
                    .filter((id) => Number.isInteger(id) && id > 0);

                if (clientIds.length === 0) {
                    res.json({ clients: [] });
                    return;
                }
                clientsWhere.id = { [Op.in]: clientIds };
            } else {
                // Otros roles: solo los asociados a sí mismo
                const userClients = await UserClients.findAll({
                    where: { userId: req.user.id },
                    attributes: ['clientId']
                });
                clientIds = userClients.map(uc => uc.dataValues.clientId);
                if (clientIds.length === 0) {
                    res.json({ clients: [] });
                    return;
                }
                clientsWhere.id = { [Op.in]: clientIds };
            }

            if (!isAdmin && scopedRaffleIds && scopedRaffleIds.length > 0) {
                scopedRaffleIds = await getVisibleRaffleIds(scopedRaffleIds);
                if (scopedRaffleIds.length === 0) {
                    res.json({ clients: [] });
                    return;
                }
            }

            // Filtro de búsqueda por nombre, apellido, teléfono y dirección
            if (search) {
                const searchConditions = [];
                // Siempre buscar por teléfono
                searchConditions.push({ phone: { [Op.like]: `%${search}%` } });
                // Buscar nombres, apellidos y dirección sin importar mayúsculas/minúsculas
                if (Op.iLike) {
                    searchConditions.push({ firstName: { [Op.iLike]: `%${search}%` } });
                    searchConditions.push({ lastName: { [Op.iLike]: `%${search}%` } });
                    searchConditions.push({ address: { [Op.iLike]: `%${search}%` } });
                } else {
                    // Fallback para bases sin Op.iLike
                    const searchStr = typeof search === 'string' ? search.toLowerCase() : '';
                    searchConditions.push({ firstName: { [Op.like]: `%${searchStr}%` } });
                    searchConditions.push({ lastName: { [Op.like]: `%${searchStr}%` } });
                    searchConditions.push({ address: { [Op.like]: `%${searchStr}%` } });
                }
                clientsWhere[Op.or] = searchConditions;
            }

            // Filtro por rango de fecha de creación
            if (startDate && endDate) {
                clientsWhere.createdAt = {
                    [Op.between]: [
                        new Date(startDate as string),
                        new Date(endDate as string)
                    ]
                };
            } else if (startDate) {
                clientsWhere.createdAt = {
                    [Op.gte]: new Date(startDate as string)
                };
            } else if (endDate) {
                clientsWhere.createdAt = {
                    [Op.lte]: new Date(endDate as string)
                };
            }

            // Pre-filtro por rifa: solo clientes con números en esa rifa
            if (hasRaffleFilter) {
                if (!isAdmin) {
                    const visibleRaffle = await Raffle.findOne({
                        where: { id: raffleIdNumber, visible: true },
                        attributes: ['id']
                    });
                    if (!visibleRaffle) {
                        res.json({ clients: [] });
                        return;
                    }
                }

                if (scopedRaffleIds && !scopedRaffleIds.includes(raffleIdNumber)) {
                    res.json({ clients: [] });
                    return;
                }

                const raffleClientRows = await RaffleNumbers.findAll({
                    where: {
                        raffleId: raffleIdNumber,
                        clienteId: { [Op.not]: null },
                        ...(scopedRaffleIds ? { raffleId: { [Op.in]: scopedRaffleIds, [Op.eq]: raffleIdNumber } } : {})
                    },
                    attributes: [['clienteId', 'clientId']],
                    raw: true,
                    group: ['clienteId']
                });
                const raffleClientIds = raffleClientRows.map((rn: any) => rn.clientId).filter(Boolean);
                if (raffleClientIds.length === 0) {
                    res.json({ clients: [] });
                    return;
                }
                if (clientsWhere.id) {
                    const existingIds: number[] = clientsWhere.id[Op.in];
                    const intersected = existingIds.filter((id: number) => raffleClientIds.includes(id));
                    if (intersected.length === 0) {
                        res.json({ clients: [] });
                        return;
                    }
                    clientsWhere.id = { [Op.in]: intersected };
                } else {
                    clientsWhere.id = { [Op.in]: raffleClientIds };
                }
            }

            // Pre-filtro por semáforo: solo clientes con el % de vendidos correspondiente
            if (hasSemaforoFilter) {
                const pct = "SUM(CASE WHEN status = 'sold' THEN 1.0 ELSE 0 END) * 100.0 / NULLIF(COUNT(id), 0)";
                let havingClause: string;
                if (semaforo === 'blue')        havingClause = `${pct} > 75`;
                else if (semaforo === 'green')  havingClause = `${pct} > 50 AND ${pct} <= 75`;
                else if (semaforo === 'orange') havingClause = `${pct} > 25 AND ${pct} <= 50`;
                else                            havingClause = `${pct} <= 25`;

                const semaforoRows = await RaffleNumbers.findAll({
                    where: {
                        clienteId: { [Op.not]: null },
                        ...(hasRaffleFilter
                            ? { raffleId: raffleIdNumber }
                            : scopedRaffleIds
                                ? { raffleId: { [Op.in]: scopedRaffleIds } }
                                : {})
                    },
                    attributes: [['clienteId', 'clientId']],
                    having: Sequelize.literal(havingClause),
                    group: ['clienteId'],
                    raw: true
                });
                const semaforoClientIds = semaforoRows.map((rn: any) => rn.clientId).filter(Boolean);
                if (semaforoClientIds.length === 0) {
                    res.json({ clients: [] });
                    return;
                }
                if (clientsWhere.id) {
                    const existingIds: number[] = clientsWhere.id[Op.in];
                    const intersected = existingIds.filter((id: number) => semaforoClientIds.includes(id));
                    if (intersected.length === 0) {
                        res.json({ clients: [] });
                        return;
                    }
                    clientsWhere.id = { [Op.in]: intersected };
                } else {
                    clientsWhere.id = { [Op.in]: semaforoClientIds };
                }
            }

            const clients = await Clients.findAll({
                where: clientsWhere,
                order: orderClause,
            });

            const exportClientIds = clients
                .map((client) => Number(client.dataValues.id))
                .filter((id) => Number.isInteger(id) && id > 0);

            if (exportClientIds.length > 0) {
                const raffleNumbers = await RaffleNumbers.findAll({
                    where: {
                        clienteId: { [Op.in]: exportClientIds },
                        status: { [Op.not]: 'available' },
                        ...(hasRaffleFilter
                            ? { raffleId: raffleIdNumber }
                            : scopedRaffleIds
                                ? { raffleId: { [Op.in]: scopedRaffleIds } }
                                : {})
                    },
                    attributes: [
                        'id', 'number', 'reservedDate', 'paymentAmount', 'paymentDue', 'status', 'clienteId', 'raffleId'
                    ],
                    include: [
                        {
                            model: Raffle,
                            as: 'raffle',
                            attributes: ['id', 'name', 'playDate', 'price', 'color', 'description', 'nameResponsable'],
                            ...(!isAdmin ? { where: { visible: true }, required: true } : {})
                        },
                        {
                            model: Payment,
                            as: 'payments',
                            attributes: ['id', 'amount', 'createdAt', 'paymentMethodId']
                        }
                    ],
                    order: [['reservedDate', 'DESC']]
                });

                const raffleNumbersByClient: Record<number, any[]> = {};
                raffleNumbers.forEach((rn) => {
                    const clientId = Number(rn.dataValues.clienteId);
                    if (!Number.isInteger(clientId) || clientId <= 0) return;
                    if (!raffleNumbersByClient[clientId]) {
                        raffleNumbersByClient[clientId] = [];
                    }
                    raffleNumbersByClient[clientId].push(rn);
                });

                clients.forEach((client) => {
                    const clientId = Number(client.dataValues.id);
                    const numbers = raffleNumbersByClient[clientId] || [];
                    client.setDataValue('raffleNumbers', numbers.slice(0, 50));
                });
            } else {
                clients.forEach((client) => {
                    client.setDataValue('raffleNumbers', []);
                });
            }

            // Obtener el total de números por rifa
            const raffleIds = [];
            clients.forEach(client => {
                if (client.dataValues.raffleNumbers) {
                    client.dataValues.raffleNumbers.forEach(num => {
                        if (num.dataValues.raffleId && !raffleIds.includes(num.dataValues.raffleId)) {
                            raffleIds.push(num.dataValues.raffleId);
                        }
                    });
                }
            });

            let raffleTotals: Record<number, number> = {};
            if (raffleIds.length > 0) {
                const totals = await RaffleNumbers.findAll({
                    where: { raffleId: { [Op.in]: raffleIds } },
                    attributes: ['raffleId', [RaffleNumbers.sequelize.fn('COUNT', RaffleNumbers.sequelize.col('id')), 'totalNumbers']],
                    group: ['raffleId']
                });
                totals.forEach((row) => {
                    raffleTotals[row.dataValues.raffleId] = parseInt(row.dataValues.totalNumbers);
                });
            }

            clients.forEach(client => {
                if (client.dataValues.raffleNumbers) {
                    client.dataValues.raffleNumbers.forEach(num => {
                        if (num.dataValues.raffle && num.dataValues.raffleId && raffleTotals[num.dataValues.raffleId]) {
                            num.dataValues.raffle.dataValues.totalNumbers = raffleTotals[num.dataValues.raffleId];
                        }
                    });
                }
            });

            const clientsPayload = clients.map((client) => {
                const raffleNumbers = (client.dataValues.raffleNumbers || []).map((num: any) => ({
                    id: num?.dataValues?.id ?? num?.id,
                    number: num?.dataValues?.number ?? num?.number,
                    reservedDate: num?.dataValues?.reservedDate ?? num?.reservedDate,
                    paymentAmount: num?.dataValues?.paymentAmount ?? num?.paymentAmount,
                    paymentDue: num?.dataValues?.paymentDue ?? num?.paymentDue,
                    status: num?.dataValues?.status ?? num?.status,
                    clienteId: num?.dataValues?.clienteId ?? num?.clienteId,
                    raffleId: num?.dataValues?.raffleId ?? num?.raffleId,
                    raffle: (() => {
                        const raffle = num?.dataValues?.raffle ?? num?.raffle;
                        if (!raffle) return undefined;
                        const raffleData = raffle?.dataValues ?? raffle;
                        return {
                            id: raffleData.id,
                            name: raffleData.name,
                            playDate: raffleData.playDate,
                            price: raffleData.price,
                            color: raffleData.color,
                            description: raffleData.description,
                            nameResponsable: raffleData.nameResponsable,
                            totalNumbers: raffleData.totalNumbers,
                        };
                    })(),
                    payments: ((num?.dataValues?.payments ?? num?.payments) || []).map((payment: any) => {
                        const p = payment?.dataValues ?? payment;
                        return {
                            id: p.id,
                            amount: p.amount,
                            createdAt: p.createdAt,
                            paymentMethodId: p.paymentMethodId,
                        };
                    })
                }));

                return {
                    id: client.dataValues.id,
                    firstName: client.dataValues.firstName,
                    lastName: client.dataValues.lastName,
                    phone: client.dataValues.phone,
                    address: client.dataValues.address,
                    raffleNumbers,
                };
            });

            res.json({ clients: clientsPayload });
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Hubo un Error al exportar los clientes' });
        }
    }

    static async getClientForSelect(req: Request, res: Response) {
        const { page = 1, limit = 15, search = '', order = 1 } = req.query;

        const pageNumber = parseInt(page as string);
        const limitNumber = parseInt(limit as string);
        const offset = (pageNumber - 1) * limitNumber;
        const orderValue = parseInt(order as string) || 1;
        const orderClause = clientOrderMap[orderValue] || clientOrderMap[1];

        try {
            let clientsWhere: any = {};
            const rolName = req.user.dataValues.rol.dataValues.name;
            const isAdmin = rolName === 'admin';
            const isResponsable = rolName === 'responsable';
            const isVendedor = rolName === 'vendedor';

            let clientIds: number[] = [];
            if (isAdmin) {
                // Admin: ve todos los clientes
                // No se filtra por clientIds
            } else if (isResponsable) {
                // Responsable: ve clientes de dos fuentes
                // 1. Clientes directamente asociados (UserClients)
                let directClientIds: number[] = [];
                const userClients = await UserClients.findAll({
                    where: { userId: req.user.id },
                    attributes: ['clientId']
                });
                directClientIds = userClients.map(uc => uc.dataValues.clientId);

                // 2. Clientes de rifas donde el responsable participa
                const userRaffles = await UserRifa.findAll({
                    where: { userId: req.user.id },
                    attributes: ['rifaId']
                });
                const raffleIds = userRaffles
                    .map((ur) => ur.dataValues.rifaId)
                    .filter((id) => Number.isInteger(id) && id > 0);

                const allowedRaffleIds = await getVisibleRaffleIds(raffleIds);
                
                let raffleClientsIds: number[] = [];
                if (allowedRaffleIds.length > 0) {
                    const raffleNumbers = await RaffleNumbers.findAll({
                        where: {
                            raffleId: { [Op.in]: allowedRaffleIds },
                            clienteId: { [Op.not]: null }
                        },
                        attributes: [['clienteId', 'clientId']],
                        raw: true,
                        group: ['clienteId']
                    });
                    raffleClientsIds = raffleNumbers.map(rn => (rn as any).clientId).filter(id => id);
                }

                clientIds = [...new Set([...directClientIds, ...raffleClientsIds])];
                if (clientIds.length === 0) {
                    res.json({
                        total: 0,
                        clients: [],
                        totalPages: 1,
                        currentPage: pageNumber
                    });
                    return;
                }
                clientsWhere.id = { [Op.in]: clientIds };
            } else if (isVendedor) {
                // Vendedor: ve clientes de cuatro fuentes
                // 1. Clientes directamente asociados (UserClients)
                let vendedorClientIds: number[] = [];
                const userClientsSelf = await UserClients.findAll({
                    where: { userId: req.user.id },
                    attributes: ['clientId']
                });
                vendedorClientIds = userClientsSelf.map(uc => uc.dataValues.clientId);

                // 2. Clientes asociados a su creador (responsable)
                const createdBy = req.user.dataValues.createdBy;
                if (createdBy) {
                    const userClientsCreator = await UserClients.findAll({
                        where: { userId: createdBy },
                        attributes: ['clientId']
                    });
                    vendedorClientIds = vendedorClientIds.concat(userClientsCreator.map(uc => uc.dataValues.clientId));
                }

                // 3. Clientes de rifas donde el vendedor participa
                const userRaffles = await UserRifa.findAll({
                    where: { userId: req.user.id },
                    attributes: ['rifaId']
                });
                const raffleIds = userRaffles
                    .map((ur) => ur.dataValues.rifaId)
                    .filter((id) => Number.isInteger(id) && id > 0);

                const allowedSellerRaffleIds = await getVisibleRaffleIds(raffleIds);
                
                let raffleClientsIds: number[] = [];
                if (allowedSellerRaffleIds.length > 0) {
                    const raffleNumbers = await RaffleNumbers.findAll({
                        where: {
                            raffleId: { [Op.in]: allowedSellerRaffleIds },
                            clienteId: { [Op.not]: null }
                        },
                        attributes: [['clienteId', 'clientId']],
                        raw: true,
                        group: ['clienteId']
                    });
                    raffleClientsIds = raffleNumbers.map(rn => (rn as any).clientId).filter(id => id);
                }

                // 4. Clientes de rifas donde su responsable (creador) participa
                let creatorRaffleClientsIds: number[] = [];
                if (createdBy) {
                    const creatorRaffles = await UserRifa.findAll({
                        where: { userId: createdBy },
                        attributes: ['rifaId']
                    });
                    const creatorRaffleIds = creatorRaffles.map(ur => ur.dataValues.rifaId);
                    const allowedCreatorRaffleIds = await getVisibleRaffleIds(creatorRaffleIds);
                    
                    if (allowedCreatorRaffleIds.length > 0) {
                        const creatorRaffleNumbers = await RaffleNumbers.findAll({
                            where: {
                                raffleId: { [Op.in]: allowedCreatorRaffleIds },
                                clienteId: { [Op.not]: null }
                            },
                            attributes: [['clienteId', 'clientId']],
                            raw: true,
                            group: ['clienteId']
                        });
                        creatorRaffleClientsIds = creatorRaffleNumbers.map(rn => (rn as any).clientId).filter(id => id);
                    }
                }

                clientIds = [...new Set([...vendedorClientIds, ...raffleClientsIds, ...creatorRaffleClientsIds])];
                if (clientIds.length === 0) {
                    res.json({
                        total: 0,
                        clients: [],
                        totalPages: 1,
                        currentPage: pageNumber
                    });
                    return;
                }
                clientsWhere.id = { [Op.in]: clientIds };
            } else {
                // Otros roles: solo los asociados a sí mismo
                const userClients = await UserClients.findAll({
                    where: { userId: req.user.id },
                    attributes: ['clientId']
                });
                clientIds = userClients.map(uc => uc.dataValues.clientId);
                if (clientIds.length === 0) {
                    res.json({
                        total: 0,
                        clients: [],
                        totalPages: 1,
                        currentPage: pageNumber
                    });
                    return;
                }
                clientsWhere.id = { [Op.in]: clientIds };
            }

            // Búsqueda por nombre, apellido, teléfono y dirección (como en getClientsAll)
            if (search) {
                const searchConditions = [];
                // Siempre buscar por teléfono
                searchConditions.push({ phone: { [Op.like]: `%${search}%` } });
                // Buscar nombres, apellidos y dirección sin importar mayúsculas/minúsculas
                if (Op.iLike) {
                    searchConditions.push({ firstName: { [Op.iLike]: `%${search}%` } });
                    searchConditions.push({ lastName: { [Op.iLike]: `%${search}%` } });
                    searchConditions.push({ address: { [Op.iLike]: `%${search}%` } });
                } else {
                    // Fallback para bases sin Op.iLike
                    const searchStr = typeof search === 'string' ? search.toLowerCase() : '';
                    searchConditions.push({ firstName: { [Op.like]: `%${searchStr}%` } });
                    searchConditions.push({ lastName: { [Op.like]: `%${searchStr}%` } });
                    searchConditions.push({ address: { [Op.like]: `%${searchStr}%` } });
                }
                clientsWhere[Op.or] = searchConditions;
            }

            const { count, rows: clients } = await Clients.findAndCountAll({
                distinct: true,
                where: clientsWhere,
                limit: limitNumber,
                offset: offset,
                order: orderClause
            });
            res.json({
                total: count,
                clients,
                totalPages: Math.ceil(count / limitNumber),
                currentPage: pageNumber
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Hubo un Error' });
        }
    }

    static async getClientsAll( req: Request, res: Response ){
        const {page = 1, limit = 15, search, order = 1, startDate, endDate, raffleId, semaforo } = req.query

        const pageNumber = parseInt(page as string);
        const limitNumber = parseInt(limit as string);
        const offset = (pageNumber - 1) * limitNumber;
        const orderValue = parseInt(order as string) || 1;
        const orderClause = clientOrderMap[orderValue] || clientOrderMap[1];
        const raffleIdNumber = Number(raffleId);
        const hasRaffleFilter = Number.isInteger(raffleIdNumber) && raffleIdNumber > 0;
        const hasSemaforoFilter = typeof semaforo === 'string' && ['blue', 'green', 'orange', 'red'].includes(semaforo);

        try {
            let clientsWhere : any = {}
            const rolName = req.user.dataValues.rol.dataValues.name;
            const isAdmin = rolName === 'admin';
            const isResponsable = rolName === 'responsable';
            const isVendedor = rolName === 'vendedor';
            let scopedRaffleIds: number[] | null = null;

            let clientIds: number[] = [];
            if (isAdmin) {
                // Admin: ve todos los clientes
                // No se filtra por clientIds
            } else if (isResponsable) {
                // Responsable: solo ve clientes con números en SUS propias rifas
                const userRaffles = await UserRifa.findAll({
                    where: { userId: req.user.id },
                    attributes: ['rifaId']
                });
                const raffleIds = userRaffles
                    .map(ur => ur.dataValues.rifaId)
                    .filter((id) => Number.isInteger(id) && id > 0);

                if (raffleIds.length === 0) {
                    res.json({
                        total: 0,
                        clients: [],
                        totalPages: 1,
                        currentPage: pageNumber
                    });
                    return;
                }

                scopedRaffleIds = raffleIds;

                const raffleNumbers = await RaffleNumbers.findAll({
                    where: {
                        raffleId: { [Op.in]: raffleIds },
                        clienteId: { [Op.not]: null }
                    },
                    attributes: [['clienteId', 'clientId']],
                    raw: true,
                    group: ['clienteId']
                });
                clientIds = raffleNumbers
                    .map(rn => (rn as any).clientId)
                    .filter((id) => Number.isInteger(id) && id > 0);

                if (clientIds.length === 0) {
                    res.json({
                        total: 0,
                        clients: [],
                        totalPages: 1,
                        currentPage: pageNumber
                    });
                    return;
                }
                clientsWhere.id = { [Op.in]: clientIds };
            } else if (isVendedor) {
                // Vendedor: solo ve clientes con números en rifas a las que él tiene acceso.
                const createdBy = req.user.dataValues.createdBy;
                const userRaffles = await UserRifa.findAll({
                    where: { userId: req.user.id },
                    attributes: ['rifaId']
                });
                const sellerRaffleIds = userRaffles
                    .map((ur) => ur.dataValues.rifaId)
                    .filter((id) => Number.isInteger(id) && id > 0);

                // Si existe creador, mantenemos consistencia limitando a la intersección con sus rifas.
                if (createdBy) {
                    const creatorRaffles = await UserRifa.findAll({
                        where: { userId: createdBy },
                        attributes: ['rifaId']
                    });
                    const creatorRaffleIds = creatorRaffles
                        .map((ur) => ur.dataValues.rifaId)
                        .filter((id) => Number.isInteger(id) && id > 0);

                    scopedRaffleIds = sellerRaffleIds.filter((id) => creatorRaffleIds.includes(id));
                } else {
                    scopedRaffleIds = sellerRaffleIds;
                }

                if (scopedRaffleIds.length === 0) {
                    res.json({
                        total: 0,
                        clients: [],
                        totalPages: 1,
                        currentPage: pageNumber
                    });
                    return;
                }

                const creatorRaffleNumbers = await RaffleNumbers.findAll({
                    where: {
                        raffleId: { [Op.in]: scopedRaffleIds },
                        clienteId: { [Op.not]: null },
                        status: { [Op.not]: 'available' }
                    },
                    attributes: [['clienteId', 'clientId']],
                    raw: true,
                    group: ['clienteId']
                });

                clientIds = creatorRaffleNumbers
                    .map((rn) => Number((rn as any).clientId))
                    .filter((id) => Number.isInteger(id) && id > 0);

                if (clientIds.length === 0) {
                    res.json({
                        total: 0,
                        clients: [],
                        totalPages: 1,
                        currentPage: pageNumber
                    });
                    return;
                }
                clientsWhere.id = { [Op.in]: clientIds };
            } else {
                // Otros roles: solo los asociados a sí mismo
                const userClients = await UserClients.findAll({
                    where: { userId: req.user.id },
                    attributes: ['clientId']
                });
                clientIds = userClients.map(uc => uc.dataValues.clientId);
                if (clientIds.length === 0) {
                    res.json({
                        total: 0,
                        clients: [],
                        totalPages: 1,
                        currentPage: pageNumber
                    });
                    return;
                }
                clientsWhere.id = { [Op.in]: clientIds };
            }

            if (!isAdmin && scopedRaffleIds && scopedRaffleIds.length > 0) {
                scopedRaffleIds = await getVisibleRaffleIds(scopedRaffleIds);
                if (scopedRaffleIds.length === 0) {
                    res.json({ total: 0, clients: [], totalPages: 1, currentPage: pageNumber });
                    return;
                }
            }

            if (search) {
                const searchConditions = [];
                // Siempre buscar por teléfono
                searchConditions.push({ phone: { [Op.like]: `%${search}%` } });
                // Buscar nombres y apellidos sin importar mayúsculas/minúsculas
                if (Op.iLike) {
                    searchConditions.push({ firstName: { [Op.iLike]: `%${search}%` } });
                    searchConditions.push({ lastName: { [Op.iLike]: `%${search}%` } });
                } else {
                    // Fallback para bases sin Op.iLike
                    const searchStr = typeof search === 'string' ? search.toLowerCase() : '';
                    searchConditions.push({ firstName: { [Op.like]: `%${searchStr}%` } });
                    searchConditions.push({ lastName: { [Op.like]: `%${searchStr}%` } });
                }
                clientsWhere[Op.or] = searchConditions;
            }

            // Filtro por rango de fecha de creación
            if (startDate && endDate) {
                clientsWhere.createdAt = {
                    [Op.between]: [
                        new Date(startDate as string),
                        new Date(endDate as string)
                    ]
                };
            } else if (startDate) {
                clientsWhere.createdAt = {
                    [Op.gte]: new Date(startDate as string)
                };
            } else if (endDate) {
                clientsWhere.createdAt = {
                    [Op.lte]: new Date(endDate as string)
                };
            }

            // Pre-filtro por rifa: solo clientes con números en esa rifa
            if (hasRaffleFilter) {
                if (!isAdmin) {
                    const visibleRaffle = await Raffle.findOne({
                        where: { id: raffleIdNumber, visible: true },
                        attributes: ['id']
                    });
                    if (!visibleRaffle) {
                        res.json({ total: 0, clients: [], totalPages: 1, currentPage: pageNumber });
                        return;
                    }
                }

                if (scopedRaffleIds && !scopedRaffleIds.includes(raffleIdNumber)) {
                    res.json({ total: 0, clients: [], totalPages: 1, currentPage: pageNumber });
                    return;
                }

                const raffleClientRows = await RaffleNumbers.findAll({
                    where: {
                        raffleId: raffleIdNumber,
                        status: { [Op.not]: 'available' }
                    },
                    attributes: ['clienteId'],
                    raw: true,
                    group: ['clienteId']
                });
                const raffleClientIds = raffleClientRows.map((rn: any) => rn.clienteId).filter(Boolean);
                if (raffleClientIds.length === 0) {
                    res.json({ total: 0, clients: [], totalPages: 1, currentPage: pageNumber });
                    return;
                }
                if (clientsWhere.id) {
                    const existingIds: number[] = clientsWhere.id[Op.in];
                    const intersected = existingIds.filter((id: number) => raffleClientIds.includes(id));
                    if (intersected.length === 0) {
                        res.json({ total: 0, clients: [], totalPages: 1, currentPage: pageNumber });
                        return;
                    }
                    clientsWhere.id = { [Op.in]: intersected };
                } else {
                    clientsWhere.id = { [Op.in]: raffleClientIds };
                }
            }

            // Pre-filtro por semáforo: solo clientes con el % de vendidos correspondiente
            if (hasSemaforoFilter) {
                const pct = "SUM(CASE WHEN status = 'sold' THEN 1.0 ELSE 0 END) * 100.0 / NULLIF(COUNT(id), 0)";
                let havingClause: string;
                if (semaforo === 'blue')        havingClause = `${pct} > 75`;
                else if (semaforo === 'green')  havingClause = `${pct} > 50 AND ${pct} <= 75`;
                else if (semaforo === 'orange') havingClause = `${pct} > 25 AND ${pct} <= 50`;
                else                            havingClause = `${pct} <= 25`;

                const semaforoRows = await RaffleNumbers.findAll({
                    where: {
                        clienteId: { [Op.not]: null },
                        ...(hasRaffleFilter
                            ? { raffleId: raffleIdNumber }
                            : scopedRaffleIds
                                ? { raffleId: { [Op.in]: scopedRaffleIds } }
                                : {})
                    },
                    attributes: [['clienteId', 'clientId']],
                    having: Sequelize.literal(havingClause),
                    group: ['clienteId'],
                    raw: true
                });
                const semaforoClientIds = semaforoRows.map((rn: any) => rn.clientId).filter(Boolean);
                if (semaforoClientIds.length === 0) {
                    res.json({ total: 0, clients: [], totalPages: 1, currentPage: pageNumber });
                    return;
                }
                if (clientsWhere.id) {
                    const existingIds: number[] = clientsWhere.id[Op.in];
                    const intersected = existingIds.filter((id: number) => semaforoClientIds.includes(id));
                    if (intersected.length === 0) {
                        res.json({ total: 0, clients: [], totalPages: 1, currentPage: pageNumber });
                        return;
                    }
                    clientsWhere.id = { [Op.in]: intersected };
                } else {
                    clientsWhere.id = { [Op.in]: semaforoClientIds };
                }
            }

            // Consulta principal
            const count = await Clients.count({
                where: clientsWhere,
                distinct: true,
                col: 'id'
            });

            const clients = await Clients.findAll({
                where: clientsWhere,
                limit: limitNumber,
                offset: offset,
                order: orderClause
            });

            const pageClientIds = clients
                .map((client) => Number(client.dataValues.id))
                .filter((id) => Number.isInteger(id) && id > 0);

            if (pageClientIds.length > 0) {
                const raffleNumbers = await RaffleNumbers.findAll({
                    where: {
                        clienteId: { [Op.in]: pageClientIds },
                        status: { [Op.not]: 'available' },
                        ...(hasRaffleFilter
                            ? { raffleId: raffleIdNumber }
                            : scopedRaffleIds
                                ? { raffleId: { [Op.in]: scopedRaffleIds } }
                                : {})
                    },
                    attributes: [
                        'id', 'number', 'reservedDate', 'paymentAmount', 'paymentDue', 'status', 'clienteId', 'raffleId'
                    ],
                    include: [
                        {
                            model: Raffle,
                            as: 'raffle',
                            attributes: ['id', 'name', 'playDate', 'price', 'color', 'description', 'nameResponsable'],
                            ...(!isAdmin ? { where: { visible: true }, required: true } : {})
                        },
                        {
                            model: Payment,
                            as: 'payments',
                            attributes: ['id', 'amount', 'createdAt', 'paymentMethodId']
                        }
                    ],
                    order: [['reservedDate', 'DESC']]
                });

                const raffleNumbersByClient: Record<number, any[]> = {};
                raffleNumbers.forEach((rn) => {
                    const clientId = Number(rn.dataValues.clienteId);
                    if (!Number.isInteger(clientId) || clientId <= 0) return;
                    if (!raffleNumbersByClient[clientId]) {
                        raffleNumbersByClient[clientId] = [];
                    }
                    raffleNumbersByClient[clientId].push(rn);
                });

                clients.forEach((client) => {
                    const clientId = Number(client.dataValues.id);
                    const numbers = raffleNumbersByClient[clientId] || [];
                    client.setDataValue('raffleNumbers', numbers.slice(0, 50));
                });
            } else {
                clients.forEach((client) => {
                    client.setDataValue('raffleNumbers', []);
                });
            }

            // Obtener el total de números por rifa
            const raffleIds = [];
            clients.forEach(client => {
                if (client.dataValues.raffleNumbers) {
                    client.dataValues.raffleNumbers.forEach(num => {
                        if (num.dataValues.raffleId && !raffleIds.includes(num.dataValues.raffleId)) {
                            raffleIds.push(num.dataValues.raffleId);
                        }
                    });
                }
            });

            // Consultar el total de números por cada rifa
            let raffleTotals: Record<number, number> = {};
            if (raffleIds.length > 0) {
                const totals = await RaffleNumbers.findAll({
                    where: { raffleId: { [Op.in]: raffleIds } },
                    attributes: ['raffleId', [RaffleNumbers.sequelize.fn('COUNT', RaffleNumbers.sequelize.col('id')), 'totalNumbers']],
                    group: ['raffleId']
                });
                totals.forEach((row) => {
                    raffleTotals[row.dataValues.raffleId] = parseInt(row.dataValues.totalNumbers);
                });
            }

            // Inyectar el total en cada objeto de rifa dentro raffleNumbers
            clients.forEach(client => {
                if (client.dataValues.raffleNumbers) {
                    client.dataValues.raffleNumbers.forEach(num => {
                        if (num.dataValues.raffle && num.dataValues.raffleId && raffleTotals[num.dataValues.raffleId]) {
                            num.dataValues.raffle.dataValues.totalNumbers = raffleTotals[num.dataValues.raffleId];
                        }
                    });
                }
            });

            // Calcular estatus semáforo por cliente según porcentaje de números vendidos
            const clientIdsForStatus = clients.map((client) => client.dataValues.id).filter(Boolean);

            if (clientIdsForStatus.length > 0) {
                const clientsPaymentStats = await RaffleNumbers.findAll({
                    where: {
                        clienteId: { [Op.in]: clientIdsForStatus },
                        ...(scopedRaffleIds ? { raffleId: { [Op.in]: scopedRaffleIds } } : {})
                    },
                    attributes: [
                        'clienteId',
                        [RaffleNumbers.sequelize.fn('COUNT', RaffleNumbers.sequelize.col('id')), 'totalNumbers'],
                        [
                            RaffleNumbers.sequelize.fn(
                                'SUM',
                                RaffleNumbers.sequelize.literal(`CASE WHEN status = 'sold' THEN 1 ELSE 0 END`)
                            ),
                            'soldNumbers'
                        ]
                    ],
                    group: ['clienteId'],
                    raw: true
                });

                const statsByClientId: Record<number, { totalNumbers: number; soldNumbers: number; soldPercentage: number; semaforo: string }> = {};

                clientsPaymentStats.forEach((row: any) => {
                    const clientId = Number(row.clienteId);
                    const totalNumbers = Number(row.totalNumbers) || 0;
                    const soldNumbers = Number(row.soldNumbers) || 0;
                    const soldPercentage = totalNumbers > 0
                        ? Number(((soldNumbers / totalNumbers) * 100).toFixed(2))
                        : 0;

                    let semaforo = 'red';

                    if (soldPercentage > 75) {
                        semaforo = 'blue';
                    } else if (soldPercentage > 50) {
                        semaforo = 'green';
                    } else if (soldPercentage > 25) {
                        semaforo = 'orange';
                    }

                    statsByClientId[clientId] = {
                        totalNumbers,
                        soldNumbers,
                        soldPercentage,
                        semaforo
                    };
                });

                clients.forEach((client) => {
                    const clientId = Number(client.dataValues.id);
                    const status = statsByClientId[clientId] || {
                        totalNumbers: 0,
                        soldNumbers: 0,
                        soldPercentage: 0,
                        semaforo: 'red'
                    };

                    client.dataValues.status = status;
                });
            }

            const clientsPayload = clients.map((client) => {
                const raffleNumbers = (client.dataValues.raffleNumbers || []).map((num: any) => ({
                    id: num?.dataValues?.id ?? num?.id,
                    number: num?.dataValues?.number ?? num?.number,
                    reservedDate: num?.dataValues?.reservedDate ?? num?.reservedDate,
                    paymentAmount: num?.dataValues?.paymentAmount ?? num?.paymentAmount,
                    paymentDue: num?.dataValues?.paymentDue ?? num?.paymentDue,
                    status: num?.dataValues?.status ?? num?.status,
                    clienteId: num?.dataValues?.clienteId ?? num?.clienteId,
                    raffleId: num?.dataValues?.raffleId ?? num?.raffleId,
                    raffle: (() => {
                        const raffle = num?.dataValues?.raffle ?? num?.raffle;
                        if (!raffle) return undefined;
                        const raffleData = raffle?.dataValues ?? raffle;
                        return {
                            id: raffleData.id,
                            name: raffleData.name,
                            playDate: raffleData.playDate,
                            price: raffleData.price,
                            color: raffleData.color,
                            description: raffleData.description,
                            nameResponsable: raffleData.nameResponsable,
                            totalNumbers: raffleData.totalNumbers,
                        };
                    })(),
                    payments: ((num?.dataValues?.payments ?? num?.payments) || []).map((payment: any) => {
                        const p = payment?.dataValues ?? payment;
                        return {
                            id: p.id,
                            amount: p.amount,
                            createdAt: p.createdAt,
                            paymentMethodId: p.paymentMethodId,
                        };
                    })
                }));

                return {
                    id: client.dataValues.id,
                    firstName: client.dataValues.firstName,
                    lastName: client.dataValues.lastName,
                    phone: client.dataValues.phone,
                    address: client.dataValues.address,
                    status: client.dataValues.status,
                    raffleNumbers,
                };
            });

            res.json({ 
                total: count,
                clients: clientsPayload,
                totalPages: Math.ceil(count / limitNumber),
                currentPage: pageNumber,
            })

        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un en la obtencion de los clientes'})
        }
    }

    static async getClientById ( req: Request, res: Response ){
        try {
            res.json(req.client)
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }
    
    static async createClient ( req: Request, res: Response ){
        const parsed = clientSchema.safeParse(req.body);

        if (!parsed.success) {

            res.status(400).json({ error: 'Datos de cliente inválidos' });
            return;
        }

        const { firstName, lastName, phone, address } = parsed.data;

        try {
            
            const clientExists = await Clients.findOne({ where: { phone } });

            if (clientExists) {
                
                const userClientExist = await UserClients.findOne({
                    where: {
                        userId: req.user.id,
                        clientId: clientExists.id
                    }
                });

                if (userClientExist) {
                    res.status(400).json({ error: 'El cliente ya existe para este usuario' });
                    return;
                }

                await UserClients.create({
                    userId: req.user.id,
                    clientId: clientExists.id
                });

                res.status(200).send('Cliente asociado correctamente, usuario ya existente');
                return;
            }

            const newClient =  await Clients.create({
                firstName,
                lastName,
                phone,
                address
            });

            await UserClients.create({
                userId: req.user.id,
                clientId: newClient.id
            });

            res.status(201).send('Cliente creado y asociado correctamente');

        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static async buyNumbers ( req: Request, res: Response ){
        const parsed = buyNumbersForClientSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: 'Datos de cliente inválidos' });
            return;
        }
        let { numbers, raffleId } = parsed.data;
        // Convertir array de strings a números
        let numberList: number[] = numbers.map((n: string) => Number(n));

        try {
            const raffleExists = await Raffle.findOne({
                where: {
                    id: raffleId,
                    ...(req.user.dataValues.rol.dataValues.name !== 'admin' ? { visible: true } : {})
                },
                attributes: ['id', 'price', 'playDate']
            });

            if (!raffleExists) {
                res.status(400).json({ error: 'La rifa no existe' });
                return;
            }

            const currentDate = new Date();

            if (raffleExists.playDate < currentDate) {
                res.status(400).json({ error: 'No se pueden comprar/apartar números de una rifa ya finalizada' });
                return;
            }

            const userClient = await UserClients.findOne({
                where: {
                    userId: req.user.id,
                    clientId: req.client.id
                }
            });

            if (!userClient) {
                res.status(403).json({ error: 'No tienes permiso para comprar números para este cliente' });
                return;
            }

            const availableNumbers = await RaffleNumbers.findAll({
                where: {
                    raffleId,
                    number: { [Op.in]: numberList },
                    status: 'available'
                }
            });

            let unavailableNumbersMsg = '';
            if (availableNumbers.length === 0) {
                res.status(400).json({ error: 'Ninguno de los números está disponible o existe' });
                return;
            }
            if (availableNumbers.length < numberList.length) {
                unavailableNumbersMsg = 'Algunos números no están disponibles o no existen.';
            }

            // Actualización masiva de los números
            await RaffleNumbers.update(
                {
                    firstName: req.client.dataValues.firstName,
                    lastName: req.client.dataValues.lastName,
                    phone: req.client.dataValues.phone,
                    address: req.client.dataValues.address,
                    clienteId: req.client.id,
                    reservedDate: new Date(),
                    status: 'apartado',
                    paymentAmount: 0,
                    paymentDue: +raffleExists.dataValues.price
                },
                {
                    where: {
                        id: availableNumbers.map(n => n.id)
                    }
                }
            );

            // Buscar o crear el método de pago 'Apartado' y asociarlo a la rifa
            let payMethode = await PayMethode.findOne({ where: { name: 'Apartado' } });
            if (!payMethode) {
                payMethode = await PayMethode.create({ name: 'Apartado', isActive: true });
            }
            let rafflePayMethode = await RafflePayMethode.findOne({
                where: {
                    raffleId: raffleExists.id,
                    payMethodeId: payMethode.id
                }
            });
            if (!rafflePayMethode) {
                rafflePayMethode = await RafflePayMethode.create({
                    raffleId: raffleExists.id,
                    payMethodeId: payMethode.id,
                    isActive: true
                });
            }

            // Crear los pagos individualmente
            for (const raffleNumber of availableNumbers) {
                await Payment.create({
                    riffleNumberId: raffleNumber.id,
                    userId: req.user.id,
                    amount: 0,
                    paymentMethodId: rafflePayMethode.id
                });
            }

            let finalMsg = 'Números actualizados correctamente';
            if (unavailableNumbersMsg) {
                finalMsg += `. ${unavailableNumbersMsg}`;
            }
            res.status(200).json({ message: finalMsg });
        } catch (error) {
            console.log(error);
            res.status(400).json({ error: 'Error al procesar la compra/apartado de números' });
        }
    }

    static async updateClient ( req: Request, res: Response ){

        const parsed = clientSchema.safeParse(req.body);

        if (!parsed.success) {

            res.status(400).json({ error: 'Datos de cliente inválidos' });
            return;
        }

        const { firstName, lastName, phone, address } = parsed.data;

        try {

            const clientWithPhone = await Clients.findOne({ where: { phone } });

            if (clientWithPhone && clientWithPhone.id !== req.client.id) {
                res.status(400).json({ error: 'El teléfono ya está asociado a otro cliente' });
                return;
            }
        
            await req.client.update({
                firstName,
                lastName,
                phone,
                address
            });
            res.status(200).send('Cliente actualizado correctamente')

        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static async deleteClient ( req: Request, res: Response ){
        try {
            await req.client.destroy();
            res.status(200).send('Cliente eliminado correctamente');
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})     
        }
    }

}

export default clientsController