import { CorsOptions } from 'cors'; 

export const corsConfig: CorsOptions = {

    origin: function (origin, callback) {
        const whitelist = [
            process.env.FRONTEND_URL,
            process.env.FRONTEND_URL_PROD1,
            process.env.FRONTEND_URL_PROD2,
            process.env.FRONTEND_URL_PROD3,
        ];

        if (process.argv[2] === '--api') {
            whitelist.push(undefined);
        }

        if (whitelist.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Error de CORS'));
        }
    }
};

