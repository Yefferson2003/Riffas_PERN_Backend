import { Sequelize} from 'sequelize-typescript'
import dotenv from 'dotenv';

dotenv.config();

const db = new Sequelize(process.env.DATABASE_URL!, {
    logging: false,
    models: [__dirname + '/../models/**/*']
}); 


async function connectDB() {
    try {
        await db.authenticate();
        await db.sync()
        console.log('Conexión exitosa a la base de datos');

    } catch (error) {
        console.log(error);
        console.log('Hubo un error en la conexión de la DB');
    }
}

export default connectDB;
