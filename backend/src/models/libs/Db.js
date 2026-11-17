const knexFileObject = require('../../../knexfile.js');

class Db {

    init() {
        this.queryBuilder = this._initQuerybuilder();
    }

    _initQuerybuilder() {
        const knex = require('knex')(knexFileObject);
        return knex;
    }

    getQueryBuilder() {
        return this.queryBuilder;
    }

    getTransactionProvider() {
        return this.getQueryBuilder().transactionProvider();
    }

}

module.exports = new Db();

