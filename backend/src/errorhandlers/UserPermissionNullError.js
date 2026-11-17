const PrtError = require('./PrtError');
const { ERROR_STATUS_CODES } = require('./constants');

class UserPermissionNullError extends PrtError {
    constructor(e, message=null) {
        super(e, ERROR_STATUS_CODES.USER_PERMISSIONS_NULL, "User Permissions Null");
        this.name = this.constructor.name;
    }
}

module.exports = UserPermissionNullError;
