const PrtError = require('./PrtError');
const { ERROR_STATUS_CODES } = require('./constants');

class InvalidRequestError extends PrtError {
    constructor(e, message=null) {
        super(e, ERROR_STATUS_CODES.BAD_REQUEST, message ?? "Invalid request");
        this.name = this.constructor.name;
    }
}

module.exports = InvalidRequestError;
