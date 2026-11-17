const Db = require("./libs/Db");
const BaseModel = require("./libs/BaseModel")
const DatabaseError = require("../errorhandlers/DatabaseError");
const { DB_TABLE, getDataCollectionTableName, FILTERS_LIST, getLiveVotingTableName, getVotersTableName } = require("./libs/dbConstants");

class DataCollectionModel extends BaseModel {
    constructor() {
        super(null);
    }

    async upsertDataCollection({ 
        id,
        volunteer_id,
        voter_id,
        opinion,
        constituency_number_id,
        mobile_number,
        account_id,
        is_voter_migrated,
        is_deleted,
    }, trxProvider = null) {
        try {

            const queryBuilder = await this.getQueryBuilder(trxProvider);

            if (id) {
                const dataCollectionId = await this.handleQuery(queryBuilder
                    .table(getDataCollectionTableName({ constituency_number_id, account_id }))
                    .where(this.whereStatement({
                        [DB_TABLE.DATA_COLLECTION.COLUMNS.ID.KEY]: id
                    }))
                    .update(this.getDefinedUpdates({
                        [DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY]: volunteer_id,
                        [DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY]: voter_id,
                        [DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY]: opinion,
                        [DB_TABLE.DATA_COLLECTION.COLUMNS.MOBILE_NUMBER.KEY]: mobile_number,
                        [DB_TABLE.DATA_COLLECTION.COLUMNS.IS_VOTER_MIGRATED.KEY]: is_voter_migrated,
                        [DB_TABLE.DATA_COLLECTION.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                        [DB_TABLE.DATA_COLLECTION.COLUMNS.ACCOUNT_ID.KEY]: account_id,
                        [DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY]: is_deleted,
                    }), [`${DB_TABLE.DATA_COLLECTION.COLUMNS.ID.KEY}`]));

                return dataCollectionId?.[0];
            }

            
            const dataCollectionId = await this.handleQuery(queryBuilder
                .table(getDataCollectionTableName({ constituency_number_id, account_id }))
                .insert(this.getDefinedUpdates({
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY]: volunteer_id,
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY]: voter_id,
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY]: opinion ?? DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.VALUES.OTHER,
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.MOBILE_NUMBER.KEY]: mobile_number,
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.IS_VOTER_MIGRATED.KEY]: is_voter_migrated,
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.ACCOUNT_ID.KEY]: account_id,
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY]: is_deleted,
                }), [
                    `${DB_TABLE.DATA_COLLECTION.COLUMNS.ID.KEY}`, 
                ]));

            return dataCollectionId?.[0];

        } catch (e) {
            throw new DatabaseError(e);
        }
    }

    async upsertLiveVoting({ 
      id,
      volunteer_id,
      voter_id,
      constituency_number_id,
      account_id,
      is_deleted,
  }, trxProvider = null) {
      try {

          const queryBuilder = await this.getQueryBuilder(trxProvider);

          const liveVotingRecord = await this.handleQuery(queryBuilder
            .table(getLiveVotingTableName({ constituency_number_id, account_id }))
            .where(this.whereStatement({
                [DB_TABLE.LIVE_VOTING.COLUMNS.VOTER_ID.KEY]: voter_id,
                [DB_TABLE.LIVE_VOTING.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                [DB_TABLE.LIVE_VOTING.COLUMNS.ACCOUNT_ID.KEY]: account_id,
                [DB_TABLE.LIVE_VOTING.COLUMNS.IS_DELETED.KEY]: false,
            })));

          if (liveVotingRecord.length > 0) {
              const liveVotingId = await this.handleQuery(queryBuilder
                  .table(getLiveVotingTableName({ constituency_number_id, account_id }))
                  .where(this.whereStatement({
                      [DB_TABLE.LIVE_VOTING.COLUMNS.ID.KEY]: liveVotingRecord[0][DB_TABLE.LIVE_VOTING.COLUMNS.ID.KEY]
                  }))
                  .update(this.getDefinedUpdates({
                      [DB_TABLE.LIVE_VOTING.COLUMNS.IS_DELETED.KEY]: true,
                  }), [`${DB_TABLE.LIVE_VOTING.COLUMNS.ID.KEY}`]));

              return liveVotingId?.[0];
          }

          
          const liveVottingId = await this.handleQuery(queryBuilder
              .table(getLiveVotingTableName({ constituency_number_id, account_id }))
              .insert(this.getDefinedUpdates({
                  [DB_TABLE.LIVE_VOTING.COLUMNS.VOLUNTEER_ID.KEY]: volunteer_id,
                  [DB_TABLE.LIVE_VOTING.COLUMNS.VOTER_ID.KEY]: voter_id,
                  [DB_TABLE.LIVE_VOTING.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                  [DB_TABLE.LIVE_VOTING.COLUMNS.ACCOUNT_ID.KEY]: account_id,
                  [DB_TABLE.LIVE_VOTING.COLUMNS.IS_DELETED.KEY]: is_deleted,
              }), [
                  `${DB_TABLE.LIVE_VOTING.COLUMNS.ID.KEY}`, 
              ]));

          return liveVottingId?.[0];

      } catch (e) {
          throw new DatabaseError(e);
      }
    }

    async getLiveVotingCount({ filters = {}, constituency_number_id, account_id }, trxProvider = null) {
      try {
          console.log("[DataCollectionModel] getLiveVotingCount");
          const queryBuilder = await this.getQueryBuilder(trxProvider);

          const dataCollectionCount = await this.handleQuery(queryBuilder
              .table(getLiveVotingTableName({ constituency_number_id, account_id }))
              .select(DB_TABLE.LIVE_VOTING.COLUMNS.VOLUNTEER_ID.KEY)
              .count({ count: '*' })
              .where(function() {
                if (filters?.[FILTERS_LIST.polling_station_ids]?.length > 0) {
                  this.where(queryBuilder.raw(`${DB_TABLE.LIVE_VOTING.COLUMNS.VOLUNTEER_ID.KEY} IN (SELECT ${DB_TABLE.USERS.COLUMNS.ID.KEY} FROM ${DB_TABLE.USERS.TABLE_NAME} WHERE ${DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY} IN (${filters[FILTERS_LIST.polling_station_ids].join(',')}) AND ${DB_TABLE.USERS.COLUMNS.IS_DELETED.KEY} = false )`));
                } else {
                  this.where(queryBuilder.raw('1 = 1'));
                }
              })
              .where(function() {
                  if (filters?.[FILTERS_LIST.volunteer_ids]?.length > 0) {
                    this.whereIn(DB_TABLE.LIVE_VOTING.COLUMNS.VOLUNTEER_ID.KEY, filters[FILTERS_LIST.volunteer_ids]);
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
              })
              .where(function() {
                  if (filters?.[FILTERS_LIST.voter_ids]?.length > 0) {
                    this.whereIn(DB_TABLE.LIVE_VOTING.COLUMNS.VOTER_ID.KEY, filters[FILTERS_LIST.voter_ids]);
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
              })
              .where(this.whereStatement({
                  [DB_TABLE.LIVE_VOTING.COLUMNS.ACCOUNT_ID.KEY]: account_id,
                  [DB_TABLE.LIVE_VOTING.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                  [DB_TABLE.LIVE_VOTING.COLUMNS.IS_DELETED.KEY]: false,
              }))
              .groupByRaw(DB_TABLE.LIVE_VOTING.COLUMNS.VOLUNTEER_ID.KEY)
          );
          return dataCollectionCount;
      } catch (e) {
          throw new DatabaseError(e);
      }
    }

    async getDataCollectionsCount({ filters = {}, constituency_number_id, account_id }, trxProvider = null) {
        try {
            console.log("[DataCollectionModel] getDataCollectionsCount");
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            const dataCollectionCount = await this.handleQuery(queryBuilder
                .table(getDataCollectionTableName({ constituency_number_id, account_id }))
                .select(DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY)
                .count({ count: '*' })
                .where(function() {
                  if (filters?.[FILTERS_LIST.polling_station_ids]?.length > 0) {
                    this.where(queryBuilder.raw(`${DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY} IN (SELECT ${DB_TABLE.USERS.COLUMNS.ID.KEY} FROM ${DB_TABLE.USERS.TABLE_NAME} WHERE ${DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY} IN (${filters[FILTERS_LIST.polling_station_ids].join(',')}) AND ${DB_TABLE.USERS.COLUMNS.IS_DELETED.KEY} = false )`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.data_collection_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.ID.KEY, filters[FILTERS_LIST.data_collection_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.volunteer_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY, filters[FILTERS_LIST.volunteer_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY, filters[FILTERS_LIST.voter_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_opinions]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY, filters[FILTERS_LIST.voter_opinions]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.is_voter_migrated]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.IS_VOTER_MIGRATED.KEY, filters[FILTERS_LIST.is_voter_migrated]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.from_epoch] && filters?.[FILTERS_LIST.to_epoch]) {
                      this.where(
                        queryBuilder.raw(`${DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY} >= to_timestamp(${filters[FILTERS_LIST.from_epoch]}) AND ${DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY} <= to_timestamp(${filters[FILTERS_LIST.to_epoch]})`)
                      );
                    } else if (filters?.[FILTERS_LIST.from_epoch]) {
                      this.where(DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY, '>=', `to_timestamp(${filters[FILTERS_LIST.from_epoch]})`);
                    } else if (filters?.[FILTERS_LIST.to_epoch]) {
                        this.where(DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY, '<=', `to_timestamp(${filters[FILTERS_LIST.to_epoch]})`);
                      } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(this.whereStatement({
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.ACCOUNT_ID.KEY]: account_id,
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY]: false,
                }))
                .groupByRaw(DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY)
            );
            return dataCollectionCount;
        } catch (e) {
            throw new DatabaseError(e);
        }
    }

    async getDataCollectionsMigratoryCount({ filters = {}, constituency_number_id, account_id }, trxProvider = null) {
        try {
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            const dataCollectionCount = await this.handleQuery(queryBuilder
                .table(getDataCollectionTableName({ constituency_number_id, account_id }))
                .select(DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY)
                .count({ count: '*' })
                .where(function() {
                  if (filters?.[FILTERS_LIST.polling_station_ids]?.length > 0) {
                    this.where(queryBuilder.raw(`${DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY} IN (SELECT ${DB_TABLE.USERS.COLUMNS.ID.KEY} FROM ${DB_TABLE.USERS.TABLE_NAME} WHERE ${DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY} IN (${filters[FILTERS_LIST.polling_station_ids].join(',')}) AND ${DB_TABLE.USERS.COLUMNS.IS_DELETED.KEY} = false )`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.data_collection_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.ID.KEY, filters[FILTERS_LIST.data_collection_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.volunteer_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY, filters[FILTERS_LIST.volunteer_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY, filters[FILTERS_LIST.voter_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_opinions]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY, filters[FILTERS_LIST.voter_opinions]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.from_epoch] && filters?.[FILTERS_LIST.to_epoch]) {
                      this.where(
                        queryBuilder.raw(`${DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY} >= to_timestamp(${filters[FILTERS_LIST.from_epoch]}) AND ${DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY} <= to_timestamp(${filters[FILTERS_LIST.to_epoch]})`)
                      );
                    } else if (filters?.[FILTERS_LIST.from_epoch]) {
                      this.where(DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY, '>=', `to_timestamp(${filters[FILTERS_LIST.from_epoch]})`);
                    } else if (filters?.[FILTERS_LIST.to_epoch]) {
                        this.where(DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY, '<=', `to_timestamp(${filters[FILTERS_LIST.to_epoch]})`);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(this.whereStatement({
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.IS_VOTER_MIGRATED.KEY]: true,
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.ACCOUNT_ID.KEY]: account_id,
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY]: false,
                }))
                .groupByRaw(DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY)
            );
            return dataCollectionCount;
        } catch (e) {
            throw new DatabaseError(e);
        }
    }
                

    async getDataCollectionsMobileNumberCount({ filters = {}, constituency_number_id, account_id }, trxProvider = null) {
        try {
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            const dataCollectionCount = await this.handleQuery(queryBuilder
                .table(getDataCollectionTableName({ constituency_number_id, account_id }))
                .select(DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY)
                .count({ count: '*' })
                .where(function() {
                  if (filters?.[FILTERS_LIST.polling_station_ids]?.length > 0) {
                    this.where(queryBuilder.raw(`${DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY} IN (SELECT ${DB_TABLE.USERS.COLUMNS.ID.KEY} FROM ${DB_TABLE.USERS.TABLE_NAME} WHERE ${DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY} IN (${filters[FILTERS_LIST.polling_station_ids].join(',')}) AND ${DB_TABLE.USERS.COLUMNS.IS_DELETED.KEY} = false )`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.data_collection_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.ID.KEY, filters[FILTERS_LIST.data_collection_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.volunteer_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY, filters[FILTERS_LIST.volunteer_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY, filters[FILTERS_LIST.voter_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_opinions]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY, filters[FILTERS_LIST.voter_opinions]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.is_voter_migrated]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.IS_VOTER_MIGRATED.KEY, filters[FILTERS_LIST.is_voter_migrated]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.from_epoch] && filters?.[FILTERS_LIST.to_epoch]) {
                      this.where(
                        queryBuilder.raw(`${DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY} >= to_timestamp(${filters[FILTERS_LIST.from_epoch]}) AND ${DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY} <= to_timestamp(${filters[FILTERS_LIST.to_epoch]})`)
                      );
                    } else if (filters?.[FILTERS_LIST.from_epoch]) {
                      this.where(DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY, '>=', `to_timestamp(${filters[FILTERS_LIST.from_epoch]})`);
                    } else if (filters?.[FILTERS_LIST.to_epoch]) {
                        this.where(DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY, '<=', `to_timestamp(${filters[FILTERS_LIST.to_epoch]})`);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    this.where(
                      queryBuilder.raw(`((${DB_TABLE.DATA_COLLECTION.COLUMNS.MOBILE_NUMBER.KEY} IS NOT NULL AND ${DB_TABLE.DATA_COLLECTION.COLUMNS.MOBILE_NUMBER.KEY} != '') OR (
                          EXISTS (
                            SELECT 1 
                            FROM ${getVotersTableName({ constituency_number_id })} v
                            WHERE v.${DB_TABLE.VOTERS.COLUMNS.ID.KEY} = ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY}
                            AND v.${DB_TABLE.VOTERS.COLUMNS.MOBILE_NUMBER.KEY} IS NOT NULL
                            AND v.${DB_TABLE.VOTERS.COLUMNS.MOBILE_NUMBER.KEY} != ''
                            AND v.${DB_TABLE.VOTERS.COLUMNS.IS_DELETED.KEY} = false

                          )
                        ))`)
                    );
                })
                .where(this.whereStatement({
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.ACCOUNT_ID.KEY]: account_id,
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY]: false,
                }))
                .groupByRaw(DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY)
            );
            return dataCollectionCount;
        } catch (e) {
            throw new DatabaseError(e);
        }
    }

    async getDataCollectionsPerOpinionCount({ filters = {}, constituency_number_id, account_id }, trxProvider = null) {
        try {
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            const dataCollectionCount = await this.handleQuery(queryBuilder
                .table(getDataCollectionTableName({ constituency_number_id, account_id }))
                .select(queryBuilder.raw(`${DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY}, ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY}`))
                .count('* as count')
                .where(function() {
                  if (filters?.[FILTERS_LIST.polling_station_ids]?.length > 0) {
                    this.where(queryBuilder.raw(`${DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY} IN (SELECT ${DB_TABLE.USERS.COLUMNS.ID.KEY} FROM ${DB_TABLE.USERS.TABLE_NAME} WHERE ${DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY} IN (${filters[FILTERS_LIST.polling_station_ids].join(',')}) AND ${DB_TABLE.USERS.COLUMNS.IS_DELETED.KEY} = false )`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.data_collection_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.ID.KEY, filters[FILTERS_LIST.data_collection_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.volunteer_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY, filters[FILTERS_LIST.volunteer_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY, filters[FILTERS_LIST.voter_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_opinions]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY, filters[FILTERS_LIST.voter_opinions]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.is_voter_migrated]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.IS_VOTER_MIGRATED.KEY, filters[FILTERS_LIST.is_voter_migrated]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.from_epoch] && filters?.[FILTERS_LIST.to_epoch]) {
                      this.where(
                        queryBuilder.raw(`${DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY} >= to_timestamp(${filters[FILTERS_LIST.from_epoch]}) AND ${DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY} <= to_timestamp(${filters[FILTERS_LIST.to_epoch]})`)
                      );
                    } else if (filters?.[FILTERS_LIST.from_epoch]) {
                      this.where(DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY, '>=', `to_timestamp(${filters[FILTERS_LIST.from_epoch]})`);
                    } else if (filters?.[FILTERS_LIST.to_epoch]) {
                        this.where(DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY, '<=', `to_timestamp(${filters[FILTERS_LIST.to_epoch]})`);
                      } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(this.whereStatement({
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.ACCOUNT_ID.KEY]: account_id,
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY]: false,
                }))
                .groupBy(DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY, DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY)
                .orderBy(DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY)
            );
            return dataCollectionCount;
        } catch (e) {
            throw new DatabaseError(e);
        }
    }

    async getDataCollectionsPerDayCount({ filters = {}, constituency_number_id, account_id }, trxProvider = null) {
        try {
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            const dataCollectionCount = await this.handleQuery(queryBuilder
                .table(getDataCollectionTableName({ constituency_number_id, account_id }))
                .select(queryBuilder.raw(`TO_CHAR(${DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY}, 'DD-MM-YYYY') as day, ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY}`))
                .count('* as count')
                .where(function() {
                  if (filters?.[FILTERS_LIST.polling_station_ids]?.length > 0) {
                    this.where(queryBuilder.raw(`${DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY} IN (SELECT ${DB_TABLE.USERS.COLUMNS.ID.KEY} FROM ${DB_TABLE.USERS.TABLE_NAME} WHERE ${DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY} IN (${filters[FILTERS_LIST.polling_station_ids].join(',')}) AND ${DB_TABLE.USERS.COLUMNS.IS_DELETED.KEY} = false )`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.data_collection_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.ID.KEY, filters[FILTERS_LIST.data_collection_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.volunteer_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY, filters[FILTERS_LIST.volunteer_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY, filters[FILTERS_LIST.voter_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_opinions]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY, filters[FILTERS_LIST.voter_opinions]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.is_voter_migrated]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.IS_VOTER_MIGRATED.KEY, filters[FILTERS_LIST.is_voter_migrated]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.from_epoch] && filters?.[FILTERS_LIST.to_epoch]) {
                      this.where(
                        queryBuilder.raw(`${DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY} >= to_timestamp(${filters[FILTERS_LIST.from_epoch]}) AND ${DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY} <= to_timestamp(${filters[FILTERS_LIST.to_epoch]})`)
                      );
                    } else if (filters?.[FILTERS_LIST.from_epoch]) {
                      this.where(DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY, '>=', `to_timestamp(${filters[FILTERS_LIST.from_epoch]})`);
                    } else if (filters?.[FILTERS_LIST.to_epoch]) {
                        this.where(DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY, '<=', `to_timestamp(${filters[FILTERS_LIST.to_epoch]})`);
                      } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(this.whereStatement({
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.ACCOUNT_ID.KEY]: account_id,
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY]: false,
                }))
                .groupBy('day', DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY)
                .orderBy('day')
            );
            return dataCollectionCount;
        } catch (e) {
            throw new DatabaseError(e);
        }
    }

    async getDataCollectionsAll({ constituency_number_id, account_id }, trxProvider = null) {
      try {
          const queryBuilder = await this.getQueryBuilder(trxProvider);

          const dataCollections = await this.handleQuery(queryBuilder
              .table(getDataCollectionTableName({ constituency_number_id, account_id }))
              .select(
                DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY,
                DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY,
                DB_TABLE.DATA_COLLECTION.COLUMNS.MOBILE_NUMBER.KEY,
                DB_TABLE.DATA_COLLECTION.COLUMNS.IS_VOTER_MIGRATED.KEY,
              )
              .where(this.whereStatement({
                  [DB_TABLE.DATA_COLLECTION.COLUMNS.ACCOUNT_ID.KEY]: account_id,
                  [DB_TABLE.DATA_COLLECTION.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                  [DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY]: false,
              }))
          );
          return dataCollections;
      } catch (e) {
          throw new DatabaseError(e);
      }
    }

    async getDataCollectionsByFilter({ filters = {}, constituency_number_id, account_id, page_no = 1, limit = 50 }, trxProvider = null) {
        try {
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            const dataCollections = await this.handleQuery(queryBuilder
                .table(getDataCollectionTableName({ constituency_number_id, account_id }))
                .where(function() {
                  if (filters?.[FILTERS_LIST.polling_station_ids]?.length > 0) {
                    this.where(queryBuilder.raw(`${DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY} IN (SELECT ${DB_TABLE.USERS.COLUMNS.ID.KEY} FROM ${DB_TABLE.USERS.TABLE_NAME} WHERE ${DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY} IN (${filters[FILTERS_LIST.polling_station_ids].join(',')}) AND ${DB_TABLE.USERS.COLUMNS.IS_DELETED.KEY} = false )`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.data_collection_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.ID.KEY, filters[FILTERS_LIST.data_collection_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.volunteer_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY, filters[FILTERS_LIST.volunteer_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY, filters[FILTERS_LIST.voter_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_opinions]?.length > 0) {
                      this.whereIn(DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY, filters[FILTERS_LIST.voter_opinions]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (typeof filters?.[FILTERS_LIST.is_voter_migrated] === "boolean") {
                      this.where(DB_TABLE.DATA_COLLECTION.COLUMNS.IS_VOTER_MIGRATED.KEY, "=", filters[FILTERS_LIST.is_voter_migrated]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.from_epoch] && filters?.[FILTERS_LIST.to_epoch]) {
                    this.where(
                      queryBuilder.raw(`${DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY} >= to_timestamp(${filters[FILTERS_LIST.from_epoch]}) AND ${DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY} <= to_timestamp(${filters[FILTERS_LIST.to_epoch]})`)
                    );
                  } else if (filters?.[FILTERS_LIST.from_epoch]) {
                    this.where(DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY, '>=', `to_timestamp(${filters[FILTERS_LIST.from_epoch]})`);
                  } else if (filters?.[FILTERS_LIST.to_epoch]) {
                      this.where(DB_TABLE.DATA_COLLECTION.COLUMNS.CREATED_AT.KEY, '<=', `to_timestamp(${filters[FILTERS_LIST.to_epoch]})`);
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.is_voter_mobile_number] === true) {
                    this.whereNotNull(DB_TABLE.DATA_COLLECTION.COLUMNS.MOBILE_NUMBER.KEY);
                    this.whereRaw(`${DB_TABLE.DATA_COLLECTION.COLUMNS.MOBILE_NUMBER.KEY} != ''`);
                  } else if (filters?.[FILTERS_LIST.is_voter_mobile_number] === false) {
                    this.whereRaw(`${DB_TABLE.DATA_COLLECTION.COLUMNS.MOBILE_NUMBER.KEY} = '' OR ${DB_TABLE.DATA_COLLECTION.COLUMNS.MOBILE_NUMBER.KEY} IS NULL`)
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(this.whereStatement({
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.ACCOUNT_ID.KEY]: account_id,
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                    [DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY]: false,
                }))
                .offset((page_no - 1) * limit)
                .limit(limit)
            );
            return dataCollections;
        } catch (e) {
            throw new DatabaseError(e);
        }
    }

    async getLiveVotingByFilter({ filters = {}, constituency_number_id, account_id, page_no = 1, limit = 50 }, trxProvider = null) {
      try {
          const queryBuilder = await this.getQueryBuilder(trxProvider);

          const liveVotings = await this.handleQuery(queryBuilder
              .table(getLiveVotingTableName({ constituency_number_id, account_id }))
              .where(function() {
                if (filters?.[FILTERS_LIST.polling_station_ids]?.length > 0) {
                  this.where(queryBuilder.raw(`${DB_TABLE.LIVE_VOTING.COLUMNS.VOLUNTEER_ID.KEY} IN (SELECT ${DB_TABLE.USERS.COLUMNS.ID.KEY} FROM ${DB_TABLE.USERS.TABLE_NAME} WHERE ${DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY} IN (${filters[FILTERS_LIST.polling_station_ids].join(',')}) AND ${DB_TABLE.USERS.COLUMNS.IS_DELETED.KEY} = false )`));
                } else {
                  this.where(queryBuilder.raw('1 = 1'));
                }
              })
              .where(function() {
                  if (filters?.[FILTERS_LIST.volunteer_ids]?.length > 0) {
                    this.whereIn(DB_TABLE.LIVE_VOTING.COLUMNS.VOLUNTEER_ID.KEY, filters[FILTERS_LIST.volunteer_ids]);
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
              })
              .where(function() {
                  if (filters?.[FILTERS_LIST.voter_ids]?.length > 0) {
                    this.whereIn(DB_TABLE.LIVE_VOTING.COLUMNS.VOTER_ID.KEY, filters[FILTERS_LIST.voter_ids]);
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
              })
              .where(this.whereStatement({
                  [DB_TABLE.LIVE_VOTING.COLUMNS.ACCOUNT_ID.KEY]: account_id,
                  [DB_TABLE.LIVE_VOTING.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                  [DB_TABLE.LIVE_VOTING.COLUMNS.IS_DELETED.KEY]: false,
              }))
          );
          return liveVotings;
      } catch (e) {
          throw new DatabaseError(e);
      }
  }

}

module.exports = DataCollectionModel;
