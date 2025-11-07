const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const connectDB = require("./config/db.config");
dotenv.config();
const corsHandler = require("./middleware/cors.middleware");
const logger = require("./utilities/logger.util");
const swaggerDocs = require('./config/swagger');

const AppError = require("./utilities/app.error.util");
const errorHandler = require("./middleware/errorHandler.middleware");

const { scheduleBackup } = require("./services/backup.service");

const authRoutes = require("./routes/auth.route");
const medicineRoutes = require("./routes/medicine.route");


// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error("UNCAUGHT EXCEPTION! Shutting down...");
  logger.error(`${err.name}: ${err.message}`);
  logger.error(err.stack);
  process.exit(1);
});

const PORT = process.env.PORT || 3001;
const app = express();

// Middleware
app.use(corsHandler);
app.use(express.json());
app.use("/img", express.static(path.join(__dirname, "uploads")));

// Connect DB
connectDB();

scheduleBackup();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/medicines", medicineRoutes);

// Swagger Docs (only if enabled and not in production)
swaggerDocs(app);

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

process.on("unhandledRejection", (err) => {
  logger.error("UNHANDLED REJECTION! Shutting down...");
  logger.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
