import express from "express";
import http from "http"; 
import { Server } from "socket.io";
import connectDB from "./config/db";
import cors from 'cors';
import { corsConfig } from "./config/cors";
import router from "./routes/index.routes";

connectDB();

const app = express();
const server = http.createServer(app); 
const io = new Server(server, {
    cors: corsConfig, 
});

app.use(cors(corsConfig));
app.use(express.json());

// app.set("io", io);
app.use('/api', router);

io.on("connection", (socket) => {
    console.log(`Nuevo cliente conectado: ${socket.id}`);

    // Ejemplo: Escuchar eventos del cliente
    socket.on("message", (data) => {
        console.log("Mensaje recibido:", data);
        // Responder a todos los clientes conectados
        io.emit("message", { message: "Mensaje recibido en el servidor", data });
    });

    // Ejemplo: Notificar cuando un cliente se desconecta
    socket.on("disconnect", () => {
        console.log(`Cliente desconectado: ${socket.id}`);
    });
});
app.set('io', io);

// export { io, server };
// export default app;
export default server;