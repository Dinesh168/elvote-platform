const Db = require("./Db");

class BaseModel {
    constructor(accountId) {
        // super(accountId);
        this.accountId = accountId;
    }

    async getQueryBuilder(trxProvider = null) {
        const queryBuilder = trxProvider ? await trxProvider() : Db.getQueryBuilder();
        return queryBuilder;
    }

    async handleQuery(query) {
        console.log(query.toString());
        return await query;
    }

    getAccountId() {
        return this.accountId;
    }

    whereStatement(whereObj) {

        if(!this.getAccountId()) {
            return whereObj;
        }

        return {
            ...whereObj,
            account_id: this.getAccountId()
        }
    }

    insertStatement(insertObj) {

        if(!this.getAccountId()) {
            return insertObj;
        }

        return {
            ...insertObj,
            account_id: this.getAccountId()
        }
    }

    updateStatement(updateObj) {
        return updateObj;
    }

    getDefinedUpdates(updates) {
        const definedUpdates = {};
        for (const key in updates) {
            if (updates[key] !== undefined) {
                definedUpdates[key] = updates[key];
            }
        }
        return definedUpdates;
    }
}

module.exports = BaseModel;
