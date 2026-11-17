const PrtError = require('./PrtError');
const { ERROR_STATUS_CODES } = require('./constants');

class UserCausedError extends PrtError {
    constructor(customMessage, extras = {}) {
        super(new Error(customMessage), ERROR_STATUS_CODES.BAD_REQUEST, customMessage, extras);
        this.name = this.constructor.name;
    }
}

module.exports = UserCausedError;