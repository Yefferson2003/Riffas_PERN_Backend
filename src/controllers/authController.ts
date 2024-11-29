import { Request, Response } from 'express';
import Rol from '../models/rol';
import User from '../models/user';
import { checkPassword, hashPassword } from '../utils/auth';
import { generateJWT } from '../utils/jwt';

class authController {

    static getUser = async (req: Request, res: Response) => {
        try {
            res.json(req.user)
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static creatRol = async (req: Request, res: Response) => {
        const {name} = req.body
        try {
            const rol = await Rol.create({
                name
            })
            res.status(201).send('Rol creado correctamente')
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    } 

    static createUser = async (req: Request, res: Response) => {
        const {firstName,lastName,identificationType, identificationNumber, phone, address, email, password, rolName} = req.body
        try {
            const rol = await Rol.findOne({
                where: {name: rolName}
            })

            if (!rol) {
                const error = new Error('Rol no encontrado');
                res.status(404).json({error: error.message})
                return
            }

            const userExist = await User.findOne({
                where: {email}
            })

            if (userExist) {
                const error = new Error('Usuario ya creado');
                res.status(409).json({error: error.message})
                return
            }

            const hashedPassword = await hashPassword(password)

            const user = await User.create({
                firstName, 
                lastName,
                identificationType,
                identificationNumber,
                phone,
                address,
                email,
                password: hashedPassword,
                rolId: rol.id
            })

            res.status(201).send('Usuario creado correctamente')
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }

    static login = async (req: Request, res: Response) => {
        const {email, password} = req.body 
        try {
            const user = await User.findOne({
                where: {email}
            })

            if (!user) {
                const error = new Error('Usuario no encontrado')
                res.status(404).json({error: error.message})
                return
            }

            const isPasswordCorrect = await checkPassword(password, user.dataValues.password)
            
            if (!isPasswordCorrect) {
                const error = new Error('Password incorrecta')
                res.status(401).json({error: error.message})
                return
            }

            const token = generateJWT({id: user.id})
            
            res.send(token)
        } catch (error) {
            console.log(error);
            res.status(500).json({error: 'Hubo un Error'})
        }
    }
}

export default authController