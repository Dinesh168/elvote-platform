const Db = require("./libs/Db");
const BaseModel = require("./libs/BaseModel")
const DatabaseError = require("../errorhandlers/DatabaseError");
const { DB_TABLE, PUBLIC_SCHEMA, getDataCollectionTableName, FILTERS_LIST, getPollingStationPartyTableName, getLiveVotingTableName } = require("./libs/dbConstants");

class AccountsModel extends BaseModel {
    constructor() {
        super(null);
    }

    async getAccountsByFilter({ filters = {}, page_no = 1, limit = 50 }, trxProvider = null) {
        try {
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            const accounts = await this.handleQuery(queryBuilder
                .table(DB_TABLE.ACCOUNTS.TABLE_NAME)
                .where(function() {
                    if (filters?.[FILTERS_LIST.account_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.ACCOUNTS.COLUMNS.ID.KEY, filters[FILTERS_LIST.account_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.pass_keys]?.length > 0) {
                      this.whereIn(DB_TABLE.ACCOUNTS.COLUMNS.PASS_KEY.KEY, filters[FILTERS_LIST.pass_keys]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.account_name]?.trim()?.length > 0) {
                      this.whereILike(DB_TABLE.ACCOUNTS.COLUMNS.NAME.KEY, `%${filters[FILTERS_LIST.account_name].trim()}%`);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(this.whereStatement({ 
                    [DB_TABLE.ACCOUNTS.COLUMNS.IS_DELETED.KEY]: false,
                }))
                .offset((page_no - 1) * limit)
                .limit(limit)
            );
            return accounts;
        } catch (e) {
            throw new DatabaseError(e);
        }
    }

    async upsertAccount({ id, name, passKey, other_data, constituency_number_id, is_deleted }, trxProvider = null) {
        try {

            const queryBuilder = await this.getQueryBuilder(trxProvider);

            if (id) {
                const account = await this.handleQuery(queryBuilder
                    .table(DB_TABLE.ACCOUNTS.TABLE_NAME)
                    .where(this.whereStatement({
                        [DB_TABLE.ACCOUNTS.COLUMNS.ID.KEY]: id
                    }))
                    .update(this.getDefinedUpdates({
                        [DB_TABLE.ACCOUNTS.COLUMNS.NAME.KEY]: name,
                        [DB_TABLE.ACCOUNTS.COLUMNS.PASS_KEY.KEY]: passKey,
                        [DB_TABLE.ACCOUNTS.COLUMNS.OTHER_DATA.KEY]: other_data,
                        [DB_TABLE.ACCOUNTS.COLUMNS.IS_DELETED.KEY]: is_deleted,
                    }), [`${DB_TABLE.ACCOUNTS.COLUMNS.ID.KEY}`]));

                return account?.[0];
            }

            
            const account = await this.handleQuery(queryBuilder
                .table(DB_TABLE.ACCOUNTS.TABLE_NAME)
                .insert(this.getDefinedUpdates({
                    [DB_TABLE.ACCOUNTS.COLUMNS.NAME.KEY]: name,
                    [DB_TABLE.ACCOUNTS.COLUMNS.PASS_KEY.KEY]: passKey,
                    [DB_TABLE.ACCOUNTS.COLUMNS.OTHER_DATA.KEY]: other_data,
                    [DB_TABLE.ACCOUNTS.COLUMNS.IS_DELETED.KEY]: is_deleted,
                }), [
                        `${DB_TABLE.ACCOUNTS.COLUMNS.ID.KEY}`, 
                    ]));

            if (account?.[0]) {
                await this.handleQuery(queryBuilder
                    .table(DB_TABLE.CONSTITUENCY_ACCOUNT_MAPPING.TABLE_NAME)
                    .insert(this.getDefinedUpdates({
                        [DB_TABLE.CONSTITUENCY_ACCOUNT_MAPPING.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                        [DB_TABLE.CONSTITUENCY_ACCOUNT_MAPPING.COLUMNS.ACCOUNT_ID.KEY]: account[0][DB_TABLE.ACCOUNTS.COLUMNS.ID.KEY],
                        [DB_TABLE.CONSTITUENCY_ACCOUNT_MAPPING.COLUMNS.IS_DELETED.KEY]: is_deleted,
                    }), [
                            `${DB_TABLE.CONSTITUENCY_ACCOUNT_MAPPING.COLUMNS.ID.KEY}`, 
                        ]));

                await this.handleQuery(queryBuilder.schema.withSchema(PUBLIC_SCHEMA)
                    .createTable(getDataCollectionTableName({ constituency_number_id, account_id: account[0][DB_TABLE.ACCOUNTS.COLUMNS.ID.KEY] }), function (table) {
                        table.increments(); 
                        table.integer(DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY).unsigned().notNullable();
                        table.integer(DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY).unsigned().notNullable();
                        table.specificType(DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY, 'char(1)').notNullable();
                        table.varchar(DB_TABLE.DATA_COLLECTION.COLUMNS.MOBILE_NUMBER.KEY, 15);
                        table.smallint(DB_TABLE.DATA_COLLECTION.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY).unsigned().notNullable();
                        table.smallint(DB_TABLE.DATA_COLLECTION.COLUMNS.ACCOUNT_ID.KEY).unsigned().notNullable();
                        table.boolean(DB_TABLE.DATA_COLLECTION.COLUMNS.IS_VOTER_MIGRATED.KEY).defaultTo(false);
                        table.boolean(DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY).defaultTo(false);

                        table.timestamps(true, true, false);

                        table.unique([
                            DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY, 
                            DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY
                        ], {
                            indexName: `indx_unique_DATA_COLLECTION_${constituency_number_id}_${account[0][DB_TABLE.ACCOUNTS.COLUMNS.ID.KEY]}_voterid_isDeleted`,
                            predicate: queryBuilder.whereRaw(`${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false`)
                        })

                        table.index(DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY);
                        table.index(DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY);
                        table.index(DB_TABLE.DATA_COLLECTION.COLUMNS.IS_VOTER_MIGRATED.KEY);
                    }));
                
                await this.handleQuery(queryBuilder.schema.withSchema(PUBLIC_SCHEMA)
                    .createTable(getLiveVotingTableName({ constituency_number_id, account_id: account[0][DB_TABLE.ACCOUNTS.COLUMNS.ID.KEY] }), function (table) {
                        table.increments(); 
                        table.integer(DB_TABLE.LIVE_VOTING.COLUMNS.VOLUNTEER_ID.KEY).unsigned().notNullable();
                        table.integer(DB_TABLE.LIVE_VOTING.COLUMNS.VOTER_ID.KEY).unsigned().notNullable();
                        table.smallint(DB_TABLE.LIVE_VOTING.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY).unsigned().notNullable();
                        table.smallint(DB_TABLE.LIVE_VOTING.COLUMNS.ACCOUNT_ID.KEY).unsigned().notNullable();
                        table.boolean(DB_TABLE.LIVE_VOTING.COLUMNS.IS_DELETED.KEY).defaultTo(false);

                        table.timestamps(true, true, false);

                        table.unique([
                            DB_TABLE.LIVE_VOTING.COLUMNS.VOTER_ID.KEY, 
                            DB_TABLE.LIVE_VOTING.COLUMNS.IS_DELETED.KEY
                        ], {
                            indexName: `indx_unique_LIVE_VOTING_${constituency_number_id}_${account[0][DB_TABLE.ACCOUNTS.COLUMNS.ID.KEY]}_voterid_isDeleted`,
                            predicate: queryBuilder.whereRaw(`${DB_TABLE.LIVE_VOTING.COLUMNS.IS_DELETED.KEY}=false`)
                        })

                        table.index(DB_TABLE.LIVE_VOTING.COLUMNS.VOLUNTEER_ID.KEY);
                    }));

                await this.handleQuery(queryBuilder.schema.withSchema(PUBLIC_SCHEMA)
                    .createTable(getPollingStationPartyTableName({ constituency_number_id, account_id: account[0][DB_TABLE.ACCOUNTS.COLUMNS.ID.KEY] }), function (table) {
                        table.increments(); 
                        table.smallint(DB_TABLE.POLLING_STATION_FOR_PARTY.COLUMNS.PART_NO.KEY).unsigned().notNullable();
                        table.specificType(DB_TABLE.POLLING_STATION_FOR_PARTY.COLUMNS.BOOTH_STRENGTH.KEY, 'char(1)').notNullable();
                        table.boolean(DB_TABLE.POLLING_STATION_FOR_PARTY.COLUMNS.IS_DELETED.KEY).defaultTo(false);

                        table.timestamps(true, true, false);

                        table.unique([
                            DB_TABLE.POLLING_STATION_FOR_PARTY.COLUMNS.PART_NO.KEY, 
                            DB_TABLE.POLLING_STATION_FOR_PARTY.COLUMNS.IS_DELETED.KEY
                        ], {
                            indexName: `indx_unique_POLLING_STATION_FOR_PARTY_${constituency_number_id}_${account[0][DB_TABLE.ACCOUNTS.COLUMNS.ID.KEY]}_partNo_isDeleted`,
                            predicate: queryBuilder.whereRaw(`${DB_TABLE.POLLING_STATION_FOR_PARTY.COLUMNS.IS_DELETED.KEY}=false`)
                        })

                    }));
            }

            return account?.[0];

        } catch (e) {
            throw new DatabaseError(e);
        }
    }

}

module.exports = AccountsModel;
