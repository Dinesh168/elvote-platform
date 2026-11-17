const PrtError = require('./PrtError');
const { ERROR_STATUS_CODES } = require('./constants');

class UserNotExistError extends PrtError {
    constructor(e, message=null) {
        super(e, ERROR_STATUS_CODES.USER_NOT_EXIST, "User Not Exists");
        this.name = this.constructor.name;
    }
}

module.exports = UserNotExistError;
