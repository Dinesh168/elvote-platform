const PrtError = require('./PrtError');
const { ERROR_STATUS_CODES } = require('./constants');

class UserRequestRejectedError extends PrtError {
    constructor(e, message=null) {
        super(e, ERROR_STATUS_CODES.USER_REQUEST_REJECTED, "User Request Rejected");
        this.name = this.constructor.name;
    }
}

module.exports = UserRequestRejectedError;
