const PrtError = require('./PrtError');
const { ERROR_STATUS_CODES } = require('./constants');

class UserRequestPendingError extends PrtError {
    constructor(e, message=null) {
        super(e, ERROR_STATUS_CODES.USER_REQUEST_PENDING, "User Request Pending");
        this.name = this.constructor.name;
    }
}

module.exports = UserRequestPendingError;
