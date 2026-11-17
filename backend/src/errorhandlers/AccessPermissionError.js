const PrtError = require('./PrtError');
const { ERROR_STATUS_CODES } = require('./constants');

class AccessPermissionError extends PrtError {
    constructor(responseMsg = "Permission Not Granted For This Operation.") {
        super(new Error(responseMsg), ERROR_STATUS_CODES.FORBIDDEN, responseMsg);
        this.name = this.constructor.name;
    }
}

module.exports = AccessPermissionError;
