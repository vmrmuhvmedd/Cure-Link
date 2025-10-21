const cors = require('cors');
const logger = require('../utilities/logger.util');
const AppError = require('../utilities/app.error.util');


const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : [];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            const err = new AppError('CORS Policy: Origin not allowed', 403);
            logger.warn(`CORS denied request from origin: ${origin}`);
            callback(err);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

const corsHandler = cors(corsOptions);

module.exports = corsHandler;
