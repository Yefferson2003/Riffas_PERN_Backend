import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import User from '../models/user';
import Rol from '../models/rol';
import UserRifa from '../models/user_raffle';
import Raffle from '../models/raffle';

declare global { 
    namespace Express {
        interface Request {
            user: User
        }
    }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
    const bearer = req.headers.authorization;
    
    if (!bearer || !bearer.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No autorizado. Token no proporcionado.' });
        return
    }

    const token = bearer.split(' ')[1];

    try {
        const decode = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;

        if (!decode.id) {
            res.status(401).json({ error: 'Token no válido' });
            return 
        }

        const user = await User.findOne({ 
            attributes: {exclude: ['password']},
            where: { id: decode.id }, 
            include: [
                {
                    model: Rol,
                    as: 'rol',
                    attributes: ['name']
                }
            ]
        });

        if (!user) {
            res.status(401).json({ error: 'Usuario no encontrado' });
            return 
        }
        
        if (user.dataValues.isActive === false) {
            res.status(403).json({ error: 'Cuenta desactivada. Contacte con un administrador.' });
            return;
        }

        req.user = user;

        next();
    } catch (error: any) {
        console.error('Error al verificar token:', error.message);
        res.status(401).json({ error: 'Token no válido o expirado' });
        return 
    }
};

export const authenticateSharedLink = async (req: Request, res: Response, next: NextFunction) => {
    const token = req.query.token as string;

    if (!token) {
        res.status(401).json({ error: "Token no proporcionado" });
        return
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;

        if (decoded.scope !== "raffle:share") {
            res.status(403).json({ error: "Token no válido para esta acción" });
            return
        }

        const raffle = await Raffle.findByPk(decoded.raffleId)

        if (!raffle) {
            res.status(404).json({ error: "Rifa no encontrada" });
            return
        }

        req.raffle = raffle;

        next();
    } catch (error) {
        console.error('Error al verificar token:', error.message);
        res.status(401).json({ error: 'Token no válido o expirado' });
        return 
    }
};


export const checkRole = (allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => {

    const rol = req.user.dataValues.rol.dataValues.name

    if (!allowedRoles.includes(rol)) {
        res.status(403).json({ error: 'No tienes permisos para esta acción' });
        return 
    }
    next();
};

export const validateUserRaffle = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const rol = req.user.dataValues.rol.dataValues.name

        if (rol !== 'admin') {

            const userRaffle = await UserRifa.count({
                where: {
                    userId: req.user.id,
                    rifaId: req.raffle.id
                }
            })

            if (userRaffle === 0) {
                res.status(403).json({ message: 'No tienes permisos para esta rifa' });
                return 
            }

        }

        next();
    } catch (error) {
        console.error('Error al validar permisos de usuario para la rifa:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
    
};
