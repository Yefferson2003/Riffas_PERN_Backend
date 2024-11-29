import { Request, Response } from 'express';
import User from '../models/user';
import Rol from '../models/rol';
import { Op } from 'sequelize';
import { hashPassword } from '../utils/auth';

class userController {

    static getUsers = async (req: Request, res: Response) => {
        const {vendedor, responsable} = req.query
        try {
            let filter : any = {}

            if (vendedor && !responsable) {
                filter.name = 'vendedor' 
            }

            if (responsable && !vendedor) {
                filter.name = 'responsable' 
            }

            if (!vendedor && !responsable) {
                filter.name = { [Op.ne]: 'admin' };
            }

            const users = await User.findAll({
                attributes: ['id', 'firstName','lastName', 'identificationType', 'identificationNumber', 'phone'],
                include: [
                    {
                        model: Rol,
                        as: 'rol',
                        where: filter,
                        attributes: ['name']
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
        const {firstName, lastName, identificationType,identificationNumber, phone, address} = req.body
        try {
            await req.user.update({
                firstName,
                lastName,
                identificationType,
                identificationNumber,
                phone,
                address
            })
            res.send('Usuario actualizado correctamente')
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