const PrtError = require('./PrtError');
const { ERROR_STATUS_CODES } = require('./constants');

class UnexpectedLogicalError extends PrtError {
    constructor(message, extras = {}) {
        super(new Error(message), ERROR_STATUS_CODES.INTERNAL_SERVER_ERROR, message, extras);
        this.name = this.constructor.name;
    }
}

module.exports = UnexpectedLogicalError;