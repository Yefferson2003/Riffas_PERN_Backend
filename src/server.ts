import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { corsConfig } from "./config/cors";

import connectDB from "./config/db";
import router from "./routes/index.routes";
import webhookRoutes from "./routes/indexWebhooks.routes";
import { inicializateData } from "./config/inicializateData";


connectDB();

// Inicializar datos base (roles y usuarios)
inicializateData().then(() => {
    console.log("Datos iniciales cargados");
}).catch((err) => {
    console.error("Error al inicializar datos:", err);
});

const app = express();
const server = http.createServer(app);

// ⚠️ JSON primero (necesario para webhooks)
app.use(express.json());

/* ===============================
    🔔 WEBHOOKS (SIN CORS)
================================ */
app.use("/webhooks", webhookRoutes);

/* ===============================
    🌐 API NORMAL (CON CORS)
================================ */
app.use(cors(corsConfig));
app.use("/api", router);

/* ===============================
    🔌 SOCKET.IO
================================ */
const io = new Server(server, {
    cors: corsConfig,
});

io.on("connection", (socket) => {
    console.log(`Nuevo cliente conectado: ${socket.id}`);

    socket.on("message", (data) => {
        console.log("Mensaje recibido:", data);
        io.emit("message", { message: "Mensaje recibido", data });
    });

    socket.on("disconnect", () => {
        console.log(`Cliente desconectado: ${socket.id}`);
    });
});

app.set("io", io);

export default server;
