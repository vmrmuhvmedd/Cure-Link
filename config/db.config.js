const mongoose = require('mongoose');
const logger = require('../utilities/logger.util');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.CONNECTION_STRING);
        logger.info('MongoDB Connected');
    } catch (err) {
        logger.error(`Database connection error: ${err.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;