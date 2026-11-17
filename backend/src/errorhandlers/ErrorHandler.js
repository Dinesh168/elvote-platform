const PrtError = require("./PrtError");
const DatabaseError = require("./DatabaseError");


class ErrorHandler {

    static handleError(err, req, res, next) {
        console.error("[ErrorHandler] ", err);
        
        if (res.headersSent) {
            return next(err)
        }

        if(err instanceof PrtError) {
            res.status(err.status).json({
                status: err.status,
                message: err.responseMsg,
                errorName: err.name,
                extras: err.extras
            });
        } else {
            const status = err.status || 500;
            res.status(status).json({
                status: status,
                message: "Error occurred!",
                extras: {},
                errorName: "Uncaught Error",
            });  
        }

        
    }

}

module.exports = ErrorHandler;