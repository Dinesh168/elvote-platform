const PrtError = require('./PrtError');
const { ERROR_STATUS_CODES } = require('./constants');

class FeatureRestrictionError extends PrtError {
    constructor(responseMsg = "Feature Restriction Error", extras = {}) {
        super(new Error(responseMsg), ERROR_STATUS_CODES.FEATURE_RESTRICTION, responseMsg, extras);
        this.name = this.constructor.name;
    }
}

module.exports = FeatureRestrictionError;
