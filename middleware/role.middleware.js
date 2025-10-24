const logger = require("../utilities/logger.util");
const STATUS_CODES = require("../utilities/response.codes.util");
const responsesStatus = require("../utilities/responses.status.util");
const catchAsyncUtil = require("../utilities/catch.async.util");

const authorize = (...allowedRoles) =>
  catchAsyncUtil(async (req, res, next) => {
    if (!req.user) {
      logger.warn("Unauthorized access attempt detected: no user found.");

      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        status: responsesStatus.FAIL,
        message: "Authentication required. Please log in first.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        `Access denied: user role '${
          req.user.role
        }' not permitted. Allowed roles: ${allowedRoles.join(", ")}`
      );

      return res.status(STATUS_CODES.FORBIDDEN).json({
        status: responsesStatus.FAIL,
        message: "Access denied: insufficient privileges.",
      });
    }

    logger.info(
      `Access granted for user '${req.user.email}' with role '${req.user.role}'.`
    );
    next();
  });

module.exports = authorize;
