const Db = require('./Db');
const DatabaseError = require('./../../errorhandlers/DatabaseError');

const usingTxn = async (wrappedAsyncFn = async (trxProvider) => {}, trxProvider = undefined) => {
    if (trxProvider) {
        return await wrappedAsyncFn(trxProvider);
    } else {
        const trxProvider = Db.getTransactionProvider();
        try {

            const wrapperFnOutput = await wrappedAsyncFn(trxProvider);

            const txn = await trxProvider();
            await txn.commit();
            if (!txn.isCompleted()) {
                throw new DatabaseError(new Error("Transaction commit failed"));
            }

            return wrapperFnOutput;
        } catch (e) {
            const txn = await trxProvider();
            await txn.rollback();
            throw new DatabaseError(e);
        }
    }

}

module.exports = {
    usingTxn
}
