const AppError = require('../utilities/app.error.util');
const logger = require('../utilities/logger.util');
const STATUS_CODES = require('../utilities/response.codes.util');
const responsesStatus = require('../utilities/responses.status.util');

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || STATUS_CODES.INTERNAL_SERVER_ERROR;
  err.status = err.status || responsesStatus.ERROR;

  if (err.name === 'CastError') {
    const message = `Invalid ${err.path}: ${err.value}.`;
    err = new AppError(message, STATUS_CODES.BAD_REQUEST);
  }

  if (err.code === 11000) {
    const value = Object.values(err.keyValue).join(', ');
    const message = `Duplicate field value: "${value}". Please use another value!`;
    err = new AppError(message, STATUS_CODES.BAD_REQUEST);
  }

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((el) => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    err = new AppError(message, STATUS_CODES.BAD_REQUEST);
  }

  if (err.name === 'JsonWebTokenError') {
    err = new AppError('Invalid token. Please log in again!', STATUS_CODES.UNAUTHORIZED);
  }

  if (err.name === 'TokenExpiredError') {
    err = new AppError('Your token has expired! Please log in again.', STATUS_CODES.UNAUTHORIZED);
  }

  if (err.isOperational) {
    logger.warn(`Operational Error | ${err.message}`);
  } else {
    logger.error(`Unhandled Error | ${err.message}`, err);
  }

  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      statusCode: err.statusCode,
      stack: err.stack,
    });
  }

  if (process.env.NODE_ENV === 'production') {
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }

    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      status: responsesStatus.ERROR,
      message: 'Something went very wrong!',
    });
  }

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
};

module.exports = globalErrorHandler;
