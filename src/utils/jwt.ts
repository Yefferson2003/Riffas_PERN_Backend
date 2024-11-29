import jwt from 'jsonwebtoken'
import dotenv from "dotenv";
dotenv.config()

type UserPayload = {
    id: number
}

export const generateJWT = (payload: UserPayload) => {
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
        throw new Error("La variable de entorno JWT_SECRET no está definida.");
    }

    const token = jwt.sign(payload, secret, { 
        expiresIn: '30d'
    });
    
    return token;
};