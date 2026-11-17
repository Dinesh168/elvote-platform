const PrtError = require('./PrtError');
const { ERROR_STATUS_CODES } = require('./constants');

class DatabaseError extends PrtError {
    constructor(e) {
        
        if(e && typeof e === 'string') {
            e = new Error(e);
        }

        super(e, ERROR_STATUS_CODES.INTERNAL_SERVER_ERROR, e?.message ?? "Database error occurred");
        this.name = this.constructor.name;
    }
}

module.exports = DatabaseError;