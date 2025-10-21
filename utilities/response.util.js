const responsesStatus = require('./responses.status.util');
const STATUS_CODES = require('./response.codes.util');

const sendSuccess = (res, data = null, message = 'Success', statusCode = STATUS_CODES.OK) => {
    return res.status(statusCode).json({
        status: responsesStatus.SUCCESS,
        message,
        data
    });
};

const sendFail = (res, errors = [], message = 'Fail', statusCode = STATUS_CODES.BAD_REQUEST) => {
    return res.status(statusCode).json({
        status: responsesStatus.FAIL,
        message,
        errors
    });
};

const sendError = (res, error, message = 'Error', statusCode = STATUS_CODES.INTERNAL_SERVER_ERROR) => {
    return res.status(statusCode).json({
        status: responsesStatus.ERROR,
        message,
        error
    });
};

module.exports = {
    sendSuccess,
    sendFail,
    sendError
}
