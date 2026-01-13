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

class clientsController {

    static async getClientsSharedLinkAll(req: Request, res: Response) {
        const { page = 1, limit = 15, search, startDate, endDate } = req.query;

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
            // clientsWhere.id = { [Op.in]: clientsIds };

            const rolName = req.user.dataValues.rol?.dataValues?.name || req.user.dataValues.rol?.name || req.user.rol?.name || '';
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
            // if (userRaffleIds.length > 0) {
            //     raffleNumbersWhere.raffleId = { [Op.in]: userRaffleIds };
            // }

            // Solo clientes con al menos un número de rifa con purchase.source = 'shared_link' y rifa asociada
            const { rows: clients, count } = await Clients.findAndCountAll({
                distinct: true,
                subQuery: false,
                // where: clientsWhere,
                limit: limitNumber,
                offset,
                // order: orderClause,
                include: [
                    {
                        model: RaffleNumbers,
                        as: 'raffleNumbers',
                        required: true,
                        limit: 50,
                        separate: true,
                        where: raffleNumbersWhere,
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
                                    [Op.or]: [
                                        { clientId: { [Op.in]: clientsIds } },
                                        ...(userRaffleIds.length > 0 ? [{ raffleId: { [Op.in]: userRaffleIds } }] : [])
                                    ]
                                }
                            },
                            {
                                model: Raffle,
                                as: 'raffle',
                                attributes: ['id', 'name', 'playDate', 'price', 'color']
                            }
                        ],
                        order: [['reservedDate', 'DESC']]
                    },
                    // {
                    //     model: UserClients,
                    //     as: 'userClients',
                    //     attributes: [],
                    //     required: true,
                    //     where: { userId: req.user.id }
                    // }
                ],
                order: [
                    [
                        Sequelize.literal(`(
                        SELECT MAX(rn."reservedDate")
                        FROM "raffle_numbers" rn
                        INNER JOIN "purchases" p ON p.id = rn."purchaseId"
                        WHERE rn."clienteId" = "Clients"."id"
                        AND p.source = 'shared_link'
                        ${userRaffleIds.length > 0
                            ? `AND rn."raffleId" IN (${userRaffleIds.join(',')})`
                            : ''}
                        )`),
                        'ASC'
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

            res.json({
                total: count,
                clients,
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

        const { search, order = 1, startDate, endDate } = req.query;
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
            } else if (isResponsable) {
                // Responsable: ve los clientes asociados a él
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
            } else if (isVendedor) {
                // Vendedor: ve los clientes asociados a él y a su creador (createdBy)
                const createdBy = req.user.dataValues.createdBy;
                let vendedorClientIds: number[] = [];
                // Clientes asociados a sí mismo
                const userClientsSelf = await UserClients.findAll({
                    where: { userId: req.user.id },
                    attributes: ['clientId']
                });
                vendedorClientIds = userClientsSelf.map(uc => uc.dataValues.clientId);
                // Clientes asociados a su creador
                if (createdBy) {
                    const userClientsCreator = await UserClients.findAll({
                        where: { userId: createdBy },
                        attributes: ['clientId']
                    });
                    vendedorClientIds = vendedorClientIds.concat(userClientsCreator.map(uc => uc.dataValues.clientId));
                }
                // Eliminar duplicados
                clientIds = [...new Set(vendedorClientIds)];
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

            const clients = await Clients.findAll({
                where: clientsWhere,
                order: orderClause,
                include: [
                    {
                        model: RaffleNumbers,
                        as: 'raffleNumbers',
                        attributes: [
                            'id', 'number', 'reservedDate', 'paymentAmount', 'paymentDue', 'status', 'clienteId', 'raffleId'
                        ],
                        include: [
                            {
                                model: Raffle,
                                as: 'raffle',
                                attributes: ['id', 'name', 'playDate', 'price', 'color']
                            },
                            {
                                model: Payment,
                                as: 'payments',
                                attributes: ['id', 'amount', 'createdAt', 'paymentMethodId']
                            }
                        ],
                        limit: 50,
                        order: [['reservedDate', 'DESC']]
                    }
                ]
            });

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

            res.json({ clients });
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
                // Responsable: ve los clientes asociados a él
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
            } else if (isVendedor) {
                // Vendedor: ve los clientes asociados a él y a su creador (createdBy)
                const createdBy = req.user.dataValues.createdBy;
                let vendedorClientIds: number[] = [];
                // Clientes asociados a sí mismo
                const userClientsSelf = await UserClients.findAll({
                    where: { userId: req.user.id },
                    attributes: ['clientId']
                });
                vendedorClientIds = userClientsSelf.map(uc => uc.dataValues.clientId);
                // Clientes asociados a su creador
                if (createdBy) {
                    const userClientsCreator = await UserClients.findAll({
                        where: { userId: createdBy },
                        attributes: ['clientId']
                    });
                    vendedorClientIds = vendedorClientIds.concat(userClientsCreator.map(uc => uc.dataValues.clientId));
                }
                // Eliminar duplicados
                clientIds = [...new Set(vendedorClientIds)];
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
        const {page = 1, limit = 15, search, order = 1, startDate, endDate } = req.query

        const pageNumber = parseInt(page as string);
        const limitNumber = parseInt(limit as string);
        const offset = (pageNumber - 1) * limitNumber;
        const orderValue = parseInt(order as string) || 1;
        const orderClause = clientOrderMap[orderValue] || clientOrderMap[1];

        try {
            let clientsWhere : any = {}
            const rolName = req.user.dataValues.rol.dataValues.name;
            const isAdmin = rolName === 'admin';
            const isResponsable = rolName === 'responsable';
            const isVendedor = rolName === 'vendedor';

            let clientIds: number[] = [];
            if (isAdmin) {
                // Admin: ve todos los clientes
                // No se filtra por clientIds
            } else if (isResponsable) {
                // Responsable: ve los clientes asociados a él
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
            } else if (isVendedor) {
                // Vendedor: ve los clientes asociados a él y a su creador (createdBy)
                const createdBy = req.user.dataValues.createdBy;
                let vendedorClientIds: number[] = [];
                // Clientes asociados a sí mismo
                const userClientsSelf = await UserClients.findAll({
                    where: { userId: req.user.id },
                    attributes: ['clientId']
                });
                vendedorClientIds = userClientsSelf.map(uc => uc.dataValues.clientId);
                // Clientes asociados a su creador
                if (createdBy) {
                    const userClientsCreator = await UserClients.findAll({
                        where: { userId: createdBy },
                        attributes: ['clientId']
                    });
                    vendedorClientIds = vendedorClientIds.concat(userClientsCreator.map(uc => uc.dataValues.clientId));
                }
                // Eliminar duplicados
                clientIds = [...new Set(vendedorClientIds)];
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

            // Consulta principal
            const {rows: clients, count} = await Clients.findAndCountAll({
                distinct: true,
                where: clientsWhere,
                limit: limitNumber,
                offset: offset,
                order: orderClause,
                include: [
                    {
                        model: RaffleNumbers,
                        as: 'raffleNumbers',
                        attributes: [
                            'id', 'number', 'reservedDate', 'paymentAmount', 'paymentDue', 'status', 'clienteId', 'raffleId'
                        ],
                        include: [
                            {
                                model: Raffle,
                                as: 'raffle',
                                attributes: ['id', 'name', 'playDate', 'price', 'color']
                            },
                            {
                                model: Payment,
                                as: 'payments',
                                attributes: ['id', 'amount', 'createdAt', 'paymentMethodId']
                            }
                        ],
                        limit: 50,
                        order: [['reservedDate', 'DESC']]
                    }
                ]
            });

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

            res.json({ 
                total: count,
                clients,
                totalPages: Math.ceil(count / limitNumber),
                currentPage: pageNumber,
            })

        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
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
                    id: raffleId
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

}

export default clientsController