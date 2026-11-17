const PrtError = require('./PrtError');
const { ERROR_STATUS_CODES } = require('./constants');

class FileServerError extends PrtError {
    constructor(e, message = null) {
        super(e, ERROR_STATUS_CODES.INTERNAL_SERVER_ERROR, message ?? "FileServer error occurred");
        this.name = this.constructor.name;
    }
}

module.exports = FileServerError;