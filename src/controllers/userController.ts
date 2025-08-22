import { Request, Response } from 'express';
import User from '../models/user';
import Rol from '../models/rol';
import { Op } from 'sequelize';
import { hashPassword } from '../utils/auth';
import { isValid } from 'zod';

class userController {

    static getUsers = async (req: Request, res: Response) => {
        const {vendedor, responsable, page = 1, limit = 5} = req.query

        let pageNumber = parseInt(page as string);
        const limitNumber = parseInt(limit as string);
        const offset = (pageNumber - 1) * limitNumber;
        try {
            let filter : any = {}
            let userWhere : any = {}

            if (vendedor && !responsable) {
                filter.name = 'vendedor' 
            }

            if (responsable && !vendedor) {
                filter.name = 'responsable' 
            }

            if (!vendedor && !responsable) {
                filter.name = { [Op.ne]: 'admin' };
            }

            if (req.user.dataValues.rol.dataValues.name === 'responsable') {
                userWhere.createdBy = req.user.id
            }

            const {count, rows: users} = await User.findAndCountAll({
                distinct: true,
                attributes: ['id', 'firstName','lastName', 'identificationType', 'identificationNumber', 'phone', 'email', 'address', 'createdAt', 'isActive'],
                where: userWhere,
                include: [
                    {
                        model: Rol,
                        as: 'rol',
                        where: filter,
                        attributes: ['name']
                    }
                ],
                limit: limitNumber,
                offset,
                order: [['id', 'DESC']],
            })

            res.json({
                total: count,
                users,
                totalPages: Math.ceil(count / limitNumber),
                currentPage: pageNumber,
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static getUsersBySelect = async (req: Request, res: Response) => {
        try {

            let filter : any = {}

            if (req.user.dataValues.rol.dataValues.name === 'responsable') {
                filter.createdBy = req.user.id
            }

            const users = await User.findAll({
                attributes: ['id', 'firstName', 'lastName'],
                where: filter,
                include: [
                    {
                        model: Rol,
                        as: 'rol',
                        attributes: ['name'],
                        where: {
                            name: {
                                [Op.ne]: 'admin'
                            }
                        }
                    }
                ]
            })
            res.json(users)
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static getUserById = async (req: Request, res: Response) => {
        try {
            res.json(req.user)
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static updateUser = async (req: Request, res: Response) => {
        const {firstName, lastName, identificationType,identificationNumber, phone, address, email} = req.body
        try {
            await req.user.update({
                firstName,
                lastName,
                identificationType,
                identificationNumber,
                phone,
                address,
                email
            })
            res.send('Usuario actualizado correctamente')
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static updateIsActiveUser = async (req: Request, res: Response) => {

        const { userId } = req.params
        console.log(userId);
        
        try {

            if (!userId) {
                const error = new Error('Parametro no existe')
                res.status(404).json({error: error.message})
                return 
            }

            const user = await User.findByPk(userId, {
                attributes: {exclude: ['password']},
                include: [
                    {
                        model: Rol,
                        as : 'rol',
                        attributes : ['name'],
                        where: {
                            name:{ [Op.ne]: 'admin'} 
                        }
                    }
                ]
            })

            if (!user) {
                const error = new Error('Elemento no Encontrado')
                res.status(404).json({error: error.message})
                return 
            }

            if (user.dataValues.rol.dataValues.name !== 'responsable') {
                const error = new Error('Usuario no Valido')
                res.status(403).json({error: error.message})
                return 
            }

            // if (req.user.dataValues.rol.dataValues.name === 'responsable' && 
            //     user.dataValues.createdBy !== req.user.id
            // ) {
            //     const error = new Error('Acción no Valida')
            //     res.status(401).json({error: error.message})
            //     return 
            // }

            const newIsActive = !user.dataValues.isActive;
            await user.update({ isActive: newIsActive });

            // Desactivar o activar en cascada a los vendedores creados por ese responsable
            await User.update(
                { isActive: newIsActive },
                {
                    where: {
                        createdBy: user.id, // todos los que fueron creados por este responsable
                    }
                }
            );

            res.send('Usuario actualizado correctamente y vendedores asociados actualizados');

        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static updatePasswordUser = async (req: Request, res: Response) => {
        const {password} = req.body
        try {

            const hashedPassword = await hashPassword(password)

            await req.user.update({
                password: hashedPassword
            })
            res.send('Contraseña correctamente')
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static deleteUser = async (req: Request, res: Response) => {
        try {
            await req.user.destroy()
            res.send('Usuario eliminado')
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }
}

export default userController