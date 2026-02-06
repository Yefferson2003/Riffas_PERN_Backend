import { Request, Response } from 'express'
import Moneda from '../models/moneda';
import UserTasas from '../models/userTasas';


class TasaController { 

    static async getAllMonedas(req: Request, res: Response) {
        try {

            const monedas = await Moneda.findAll({
                attributes: ['id', 'name', 'symbol'],
            });

            res.json({ 
                monedas: monedas 
            });

        } catch (error) {
            console.error('Error en la obtención de monedas:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    static async createMoneda(req: Request, res: Response) {

        const { name, symbol } = req.body;

        try {

            const existingMoneda = await Moneda.findOne({ where: { name } });

            if (existingMoneda) {
                res.status(400).json({ error: 'Ya existe una moneda con ese nombre' });
                return;
            }

            const newMoneda = await Moneda.create({ name, symbol });

            res.status(201).send('Moneda creada correctamente');
            
        } catch (error) {
            console.error('Error en la creación de la moneda:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    static async updateMoneda(req: Request, res: Response) {

        const { name, symbol } = req.body;

        try {
            
            await req.moneda.update({ name, symbol });

            res.send('Moneda actualizada correctamente');

        } catch (error) {
            console.error('Error en la actualización de la moneda:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    static async deleteMoneda(req: Request, res: Response) {
        try {
            await req.moneda.destroy();
            res.send('Moneda eliminada correctamente');
        } catch (error) {
            console.error('Error en la eliminación de la moneda:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    static async getAllUserTasas(req: Request, res: Response) {
        try {
            
            const role = req.user.dataValues.rol.dataValues.name;

            if (role != 'vendedor') {
                
                const tasas = await UserTasas.findAll({
                    attributes: ['id', 'value'],
                    where: {
                        userResponsableId: req.user!.id,
                    },
                    include: [
                        {
                            model: Moneda,
                            as: 'moneda',
                            attributes: ['id', 'name', 'symbol']
                        }
                    ]
                })
                
                console.log('tasas:', tasas);
                

                res.status(200).json({
                    tasas: tasas
                })

                return
            }

            const tasas = await UserTasas.findAll({
                attributes: ['id', 'value'],
                where: {
                    userResponsableId: req.user.dataValues.createdBy,
                },
                include: [
                    {
                        model: Moneda,
                        as: 'moneda',
                        attributes: ['id', 'name', 'symbol']
                    }
                ]
            });

            res.status(200).json({
                tasas: tasas
            })

            console.log('tasas:', tasas);

        } catch (error) {
            console.error('Error en la obtención de tasas:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }


    static async createUserTasa(req: Request, res: Response) {

        const { value } = req.body;

        try {
            
            const tasa = await UserTasas.create({
                value,
                monedaId: req.moneda.id,
                userResponsableId: req.user!.id,
            });

            res.status(201).send('Tasa creada correctamente');

        } catch (error) {
            console.error('Error en la creación de la tasa:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    static async updateUserTasa(req: Request, res: Response) {

        const { value } = req.body;

        try {
            await req.tasa.update({ value });
            res.send('Tasa actualizada correctamente');
        } catch (error) {
            console.error('Error en la actualización de la tasa:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

    static async deleteUserTasa(req: Request, res: Response) {
        try {
            await req.tasa.destroy();
            res.send('Tasa eliminada correctamente');
        } catch (error) {
            console.error('Error en la eliminación de la tasa:', error);
            res.status(500).json({
                error: 'Error interno del servidor'
            });
        }
    }

}

export default TasaController;