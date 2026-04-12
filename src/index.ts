import server from './server';
import connectDB from './config/db';
import { inicializateData } from './config/inicializateData';

const port = process.env.PORT || 4100;

async function startServer() {
    try {
        await connectDB();
        await inicializateData();
        console.log('Datos iniciales cargados');

        server.listen(port, () => {
            console.log(`REST API funcionando desde el puerto: ${port}`);
        });
    } catch (error) {
        console.error('Error al iniciar la aplicación:', error);
        process.exit(1);
    }
}

startServer();