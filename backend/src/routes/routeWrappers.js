const { RESPONSE_STATUS } = require("./middleware/schemaConstants");

const prtWrapper = (callback, allowedRoles = []) => {
    return async (req, res, next) => {
        try {
            await callback(req, res, next);
        } catch (e) {
            next(e)
        }
    }
}

const successResponsePrtWrapper = (callback, allowedRoles = []) => {
    return async (req, res, next) => {
        try {
            await callback(req, res, next);
            res.json({ 
                [RESPONSE_STATUS.KEY]: RESPONSE_STATUS.VALUES.SUCCESS.KEY
            });
        } catch (e) {
            next(e)
        }
    }
}



module.exports = {
    prtWrapper,
    successResponsePrtWrapper,
}
