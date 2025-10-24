const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const logger = require("../utilities/logger.util");
const STATUS_CODES = require("../utilities/response.codes.util");
const responsesStatus = require("../utilities/responses.status.util");
const catchAsyncUtil = require("../utilities/catch.async.util");

const authenticate = catchAsyncUtil(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logger.warn("Authentication failed: No token provided.");
    return res.status(STATUS_CODES.UNAUTHORIZED).json({
      status: responsesStatus.FAIL,
      message: "Authentication required. Please provide a valid token.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      logger.warn(`Authentication failed: User not found for ID ${decoded.id}`);
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        status: responsesStatus.FAIL,
        message: "User not found. Please log in again.",
      });
    }

    logger.info(`User authenticated successfully: ${user.email}`);
    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      logger.error("JWT verification failed: Token expired");
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        status: responsesStatus.FAIL,
        message: "Your session has expired. Please log in again.",
      });
    }

    if (err.name === "JsonWebTokenError") {
      logger.error("JWT verification failed: Invalid token signature");
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        status: responsesStatus.FAIL,
        message: "Invalid token. Please log in again.",
      });
    }

    logger.error("JWT verification failed:", err);
    return res.status(STATUS_CODES.UNAUTHORIZED).json({
      status: responsesStatus.FAIL,
      message: "Invalid or expired token. Please log in again.",
    });
  }
});

authenticate.optional = catchAsyncUtil(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (user) {
        req.user = user;
        logger.info(`Optional authentication: user ${user.email} recognized`);
      }
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        logger.warn("Optional authentication: token expired.");
      } else {
        logger.warn("Optional authentication: invalid token provided.");
      }
    }
  }

  next();
});

module.exports = authenticate;
