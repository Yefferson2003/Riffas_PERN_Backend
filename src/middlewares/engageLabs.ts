import axios from "axios";

const ENGAGELAB_BASE_URL = "https://dev.api.engagelab.cc";

const DEV_KEY = process.env.DEV_KEY_LAB!;
const DEV_SECRET = process.env.DEV_SECRET_LAB!;

// Basic Auth → base64(devKey:devSecret)
const auth = Buffer.from(`${DEV_KEY}:${DEV_SECRET}`).toString("base64");

export async function createOrganization(
    name: string,
    timezone: string
) {
    try {
        const response = await axios.post(
            `${ENGAGELAB_BASE_URL}/v1/organization`,
            {
                name,
                timezone,
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Basic ${auth}`,
                },
                timeout: 10000,
            }
        );
        return response.data; // { org_id }
    } catch (error: any) {
        if (axios.isAxiosError(error) && error.response) {
            // Mapear errores conocidos
            const code = error.response.data?.code;
            let message = error.response.data?.message || "Error desconocido";
            switch (code) {
                case 20020:
                    message = "Error de zona horaria: por favor revisa la zona horaria seleccionada.";
                    break;
                case 40000:
                    message = "Error de parámetros: revisa los datos enviados.";
                    break;
                case 40101:
                    message = "Falta el header de autorización. Contacta al administrador.";
                    break;
                case 40110:
                    message = "Header de autorización inválido. Contacta al administrador.";
                    break;
                case 40322:
                    message = "El DevKey no corresponde a una cuenta BSP.";
                    break;
                case 40324:
                    message = "Error de autenticación: DevKey o DevSecret incorrectos.";
                    break;
                default:
                    // Si hay un mensaje específico, lo dejamos
                    break;
            }
            throw new Error(message);
        }
        throw new Error("Error al crear la organización en EngageLab");
    }
}
