const path = require("path");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const logger = require("../utilities/logger.util");

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "CureLink API Documentation",
            version: "1.0.0",
            description: "Auto-generated API documentation for CureLink backend",
        },
        servers: [
            {
                url: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`,
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: [path.join(__dirname, "../routes/*.js")],
};


const swaggerSpec = swaggerJsdoc(swaggerOptions);

const swaggerDocs = (app) => {
    const enableSwagger = process.env.ENABLE_SWAGGER === "true";
    const nodeEnv = process.env.NODE_ENV || "development";
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;

    if (enableSwagger && nodeEnv !== "production") {
        app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
        logger.info(`Swagger documentation available at: ${baseUrl}/api-docs`);
    } else {
        logger.warn("Swagger is disabled for this environment.");
    }
};

module.exports = swaggerDocs;
