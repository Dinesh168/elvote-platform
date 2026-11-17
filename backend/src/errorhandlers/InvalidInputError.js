const PrtError = require('./PrtError');
const { ERROR_STATUS_CODES } = require('./constants');

class InvalidInputError extends PrtError {
    constructor(e, message=null, extras = {}) {
        super(e, ERROR_STATUS_CODES.INVALID_INPUT, message ?? "Invalid value submitted", extras);
        this.name = this.constructor.name;
    }
}

module.exports = InvalidInputError;
