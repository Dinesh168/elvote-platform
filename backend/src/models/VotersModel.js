const Db = require("./libs/Db");
const BaseModel = require("./libs/BaseModel")
const DatabaseError = require("../errorhandlers/DatabaseError");
const { DB_TABLE, getVotersTableName, getReligionForDb, FILTERS_LIST, getDataCollectionTableName, LIST_TYPE, getLiveVotingTableName } = require("./libs/dbConstants");

class VotersModel extends BaseModel {
    constructor() {
        super(null);
    }

    async insertVoters({votersList, constituency_number_id}, trxProvider = null) {
        try {
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            const voters = await this.handleQuery(queryBuilder
                .table(getVotersTableName({ constituency_number_id }))
                .insert(votersList));

            return voters ? true : false;
        } catch (e) {
            throw new DatabaseError(e);
        }
    }

    async upsertVoter({ 
        id,
        name,
        relative_name,
        relative_relation,
        epic,
        address,
        part_no,
        constituency_number_id,
        mobile_number,
        caste,
        religion,
        sno,
        age,
        gender,
        is_deleted
    }, trxProvider = null) {
        try {

            const queryBuilder = await this.getQueryBuilder(trxProvider);

            if (id) {
                const voterId = await this.handleQuery(queryBuilder
                    .table(getVotersTableName({ constituency_number_id }))
                    .where(this.whereStatement({
                        [DB_TABLE.VOTERS.COLUMNS.ID.KEY]: id
                    }))
                    .update(this.getDefinedUpdates({
                        [DB_TABLE.VOTERS.COLUMNS.NAME.KEY]: name?.trim(),
                        [DB_TABLE.VOTERS.COLUMNS.SNO.KEY]: sno,
                        [DB_TABLE.VOTERS.COLUMNS.RELATIVE_NAME.KEY]: relative_name?.trim(),
                        [DB_TABLE.VOTERS.COLUMNS.RELATIVE_RELATION.KEY]: relative_relation?.trim(),
                        [DB_TABLE.VOTERS.COLUMNS.EPIC.KEY]: epic?.trim(),
                        [DB_TABLE.VOTERS.COLUMNS.ADDRESS.KEY]: address?.trim(),
                        [DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY]: part_no,
                        [DB_TABLE.VOTERS.COLUMNS.MOBILE_NUMBER.KEY]: mobile_number,
                        [DB_TABLE.VOTERS.COLUMNS.CASTE.KEY]: caste?.trim(),
                        [DB_TABLE.VOTERS.COLUMNS.RELIGION.KEY]: getReligionForDb(religion)?.trim(),
                        [DB_TABLE.VOTERS.COLUMNS.AGE.KEY]: age,
                        [DB_TABLE.VOTERS.COLUMNS.GENDER.KEY]: gender?.trim(),
                        [DB_TABLE.VOTERS.COLUMNS.IS_DELETED.KEY]: is_deleted,
                    }), [`${DB_TABLE.VOTERS.COLUMNS.ID.KEY}`]));

                return voterId?.[0];
            }

            
            const voterId = await this.handleQuery(queryBuilder
                .table(getVotersTableName({ constituency_number_id }))
                .insert(this.getDefinedUpdates({
                    [DB_TABLE.VOTERS.COLUMNS.NAME.KEY]: name?.trim(),
                    [DB_TABLE.VOTERS.COLUMNS.SNO.KEY]: sno,
                    [DB_TABLE.VOTERS.COLUMNS.RELATIVE_NAME.KEY]: relative_name?.trim(),
                    [DB_TABLE.VOTERS.COLUMNS.RELATIVE_RELATION.KEY]: relative_relation?.trim(),
                    [DB_TABLE.VOTERS.COLUMNS.EPIC.KEY]: epic?.trim(),
                    [DB_TABLE.VOTERS.COLUMNS.ADDRESS.KEY]: address?.trim(),
                    [DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY]: part_no,
                    [DB_TABLE.VOTERS.COLUMNS.MOBILE_NUMBER.KEY]: mobile_number,
                    [DB_TABLE.VOTERS.COLUMNS.CASTE.KEY]: caste?.trim(),
                    [DB_TABLE.VOTERS.COLUMNS.RELIGION.KEY]: getReligionForDb(religion)?.trim(),
                    [DB_TABLE.VOTERS.COLUMNS.AGE.KEY]: age,
                    [DB_TABLE.VOTERS.COLUMNS.GENDER.KEY]: gender?.trim(),
                    [DB_TABLE.VOTERS.COLUMNS.IS_DELETED.KEY]: is_deleted,
                }), [
                    `${DB_TABLE.VOTERS.COLUMNS.ID.KEY}`, 
                ]));

            return voterId?.[0];

        } catch (e) {
            throw new DatabaseError(e);
        }
    }
    
    async getVotersCountPerGroup({ filters = {}, constituency_number_id, sno, epic, column_name, account_id }, trxProvider = null) {
      try {
          const queryBuilder = await this.getQueryBuilder(trxProvider);

          const voters = await this.handleQuery(queryBuilder
              .table(getVotersTableName({ constituency_number_id }))
              .select(queryBuilder.raw(`${column_name}, ${DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY}`))
              .count({ count: '*' })
              .where(function() {
                if (filters?.[FILTERS_LIST.list_type] === LIST_TYPE.APPROACHED_VOTERS) {
                  this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false)`));
                } else {
                  this.where(queryBuilder.raw('1 = 1'));
                }
              })
              .where(function() {
                if (filters?.[FILTERS_LIST.polling_station_ids]?.length > 0) {
                  this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY} IN (SELECT ${DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY} FROM ${DB_TABLE.POLLING_STATION.TABLE_NAME} WHERE ${DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY} IN (${filters[FILTERS_LIST.polling_station_ids].join(',')}) AND ${DB_TABLE.POLLING_STATION.COLUMNS.IS_DELETED.KEY}=false)`));
                } else {
                  this.where(queryBuilder.raw('1 = 1'));
                }
              })
              .where(function() {
                if (filters?.[FILTERS_LIST.voter_name]?.trim()?.length > 0 || filters?.[FILTERS_LIST.voter_address]?.trim()?.length > 0 || filters?.[FILTERS_LIST.voter_epic]?.trim()?.length > 0) {
                  this.where(queryBuilder.raw(`(${[
                      filters?.[FILTERS_LIST.voter_name]?.trim()?.length > 0 ? `${DB_TABLE.VOTERS.COLUMNS.NAME.KEY} ILIKE '%${filters[FILTERS_LIST.voter_name].trim()}%'` : '',
                      filters?.[FILTERS_LIST.voter_address]?.trim()?.length > 0 ? `TRIM(${DB_TABLE.VOTERS.COLUMNS.ADDRESS.KEY}) = '${filters[FILTERS_LIST.voter_address].trim()}'` : '',
                      filters?.[FILTERS_LIST.voter_epic]?.trim()?.length > 0 ? `${DB_TABLE.VOTERS.COLUMNS.EPIC.KEY} ILIKE '%${filters[FILTERS_LIST.voter_epic].trim()}%'` : '',
                    ].filter(val => val.length > 0).join(' OR ')})`)
                  );
                } else {
                  this.where(queryBuilder.raw('1 = 1'));
                }
              })
              .where(function() {
                  if (filters?.[FILTERS_LIST.is_voter_approached] === false) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} NOT IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false)`));
                  } else if (filters?.[FILTERS_LIST.is_voter_approached] === true) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false)`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
              .where(function() {
                  if (filters?.[FILTERS_LIST.voter_ids]?.length > 0) {
                    this.whereIn(DB_TABLE.VOTERS.COLUMNS.ID.KEY, filters[FILTERS_LIST.voter_ids]);
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
              })
              .where(function() {
                  if (filters?.[FILTERS_LIST.voter_genders]?.length > 0) {
                    this.whereIn(DB_TABLE.VOTERS.COLUMNS.GENDER.KEY, filters[FILTERS_LIST.voter_genders]);
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
              })
              .where(function() {
                  if (filters?.[FILTERS_LIST.part_nos]?.length > 0) {
                    this.whereIn(DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY, filters[FILTERS_LIST.part_nos]);
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
              })
              .where(function() {
                  if (filters?.[FILTERS_LIST.voter_castes]?.length > 0) {
                    this.whereIn(DB_TABLE.VOTERS.COLUMNS.CASTE.KEY, filters[FILTERS_LIST.voter_castes]);
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
              })
              .where(function() {
                  if (filters?.[FILTERS_LIST.voter_religions]?.length > 0) {
                    this.whereIn(DB_TABLE.VOTERS.COLUMNS.RELIGION.KEY, filters[FILTERS_LIST.voter_religions]);
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
              })
              .where(function() {
                if (filters?.[FILTERS_LIST.from_voter_age] && filters?.[FILTERS_LIST.to_voter_age]) {
                  this.where(
                    queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.AGE.KEY} >= ${filters[FILTERS_LIST.from_voter_age]} AND ${DB_TABLE.VOTERS.COLUMNS.AGE.KEY} <= ${filters[FILTERS_LIST.to_voter_age]}`)
                  );
                } else if (filters?.[FILTERS_LIST.from_voter_age]) {
                  this.where(DB_TABLE.VOTERS.COLUMNS.AGE.KEY, '>=', filters[FILTERS_LIST.from_voter_age]);
                } else if (filters?.[FILTERS_LIST.to_voter_age]) {
                    this.where(DB_TABLE.VOTERS.COLUMNS.AGE.KEY, '<=', filters[FILTERS_LIST.to_voter_age]);
                  } else {
                  this.where(queryBuilder.raw('1 = 1'));
                }
              })
              .where(this.whereStatement({
                  ...(sno ? {[DB_TABLE.VOTERS.COLUMNS.SNO.KEY]: sno} : {}),
                  ...(epic ? {[DB_TABLE.VOTERS.COLUMNS.EPIC.KEY]: epic} : {}),
                  [DB_TABLE.VOTERS.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                  [DB_TABLE.VOTERS.COLUMNS.IS_DELETED.KEY]: false,
              }))
              .groupBy(column_name, DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY)
              .orderBy(column_name)
          );
          return voters;
      } catch (e) {
          throw new DatabaseError(e);
      }
    }

    async getVotersCount({ filters = {}, constituency_number_id, account_id, sno, epic }, trxProvider = null) {
        try {
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            const voters = await this.handleQuery(queryBuilder
                .table(getVotersTableName({ constituency_number_id }))
                .select(DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY)
                .count({ count: '*' })
                .where(function() {
                  if (filters?.[FILTERS_LIST.polling_station_ids]?.length > 0) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY} IN (SELECT ${DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY} FROM ${DB_TABLE.POLLING_STATION.TABLE_NAME} WHERE ${DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY} IN (${filters[FILTERS_LIST.polling_station_ids].join(',')}) AND ${DB_TABLE.POLLING_STATION.COLUMNS.IS_DELETED.KEY}=false)`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.voter_name]?.trim()?.length > 0 || filters?.[FILTERS_LIST.voter_address]?.trim()?.length > 0 || filters?.[FILTERS_LIST.voter_epic]?.trim()?.length > 0) {
                    this.where(queryBuilder.raw(`(${[
                        filters?.[FILTERS_LIST.voter_name]?.trim()?.length > 0 ? `${DB_TABLE.VOTERS.COLUMNS.NAME.KEY} ILIKE '%${filters[FILTERS_LIST.voter_name].trim()}%'` : '',
                        filters?.[FILTERS_LIST.voter_address]?.trim()?.length > 0 ? `TRIM(${DB_TABLE.VOTERS.COLUMNS.ADDRESS.KEY}) = '${filters[FILTERS_LIST.voter_address].trim()}'` : '',
                        filters?.[FILTERS_LIST.voter_epic]?.trim()?.length > 0 ? `${DB_TABLE.VOTERS.COLUMNS.EPIC.KEY} ILIKE '%${filters[FILTERS_LIST.voter_epic].trim()}%'` : '',
                      ].filter(val => val.length > 0).join(' OR ')})`)
                    );
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.is_voter_mobile_number] === true) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE ${DB_TABLE.DATA_COLLECTION.COLUMNS.MOBILE_NUMBER.KEY} IS NOT NULL AND ${DB_TABLE.DATA_COLLECTION.COLUMNS.MOBILE_NUMBER.KEY} != '' AND ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false) OR (${DB_TABLE.VOTERS.COLUMNS.MOBILE_NUMBER.KEY} != '' AND ${DB_TABLE.VOTERS.COLUMNS.MOBILE_NUMBER.KEY} IS NOT NULL)`));
                  } else if (filters?.[FILTERS_LIST.is_voter_mobile_number] === false) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE (${DB_TABLE.DATA_COLLECTION.COLUMNS.MOBILE_NUMBER.KEY} IS NULL OR ${DB_TABLE.DATA_COLLECTION.COLUMNS.MOBILE_NUMBER.KEY} = '') AND ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false) AND (${DB_TABLE.VOTERS.COLUMNS.MOBILE_NUMBER.KEY} = '' OR ${DB_TABLE.VOTERS.COLUMNS.MOBILE_NUMBER.KEY} IS NULL)`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.ID.KEY, filters[FILTERS_LIST.voter_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_genders]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.GENDER.KEY, filters[FILTERS_LIST.voter_genders]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.part_nos]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY, filters[FILTERS_LIST.part_nos]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.is_voter_approached] === false) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} NOT IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false)`));
                  } else if (filters?.[FILTERS_LIST.is_voter_approached] === true) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false)`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_castes]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.CASTE.KEY, filters[FILTERS_LIST.voter_castes]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_religions]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.RELIGION.KEY, filters[FILTERS_LIST.voter_religions]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.from_voter_age] && filters?.[FILTERS_LIST.to_voter_age]) {
                    this.whereBetween(DB_TABLE.VOTERS.COLUMNS.AGE.KEY, [
                      filters[FILTERS_LIST.from_voter_age], filters[FILTERS_LIST.to_voter_age]
                    ]);
                  } else if (filters?.[FILTERS_LIST.from_voter_age]) {
                    this.where(DB_TABLE.VOTERS.COLUMNS.AGE.KEY, '>=', filters[FILTERS_LIST.from_voter_age]);
                  } else if (filters?.[FILTERS_LIST.to_voter_age]) {
                      this.where(DB_TABLE.VOTERS.COLUMNS.AGE.KEY, '<=', filters[FILTERS_LIST.to_voter_age]);
                    } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(this.whereStatement({
                    ...(sno ? {[DB_TABLE.VOTERS.COLUMNS.SNO.KEY]: sno} : {}),
                    ...(epic ? {[DB_TABLE.VOTERS.COLUMNS.EPIC.KEY]: epic} : {}),
                    [DB_TABLE.VOTERS.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                    [DB_TABLE.VOTERS.COLUMNS.IS_DELETED.KEY]: false,
                }))
                .groupByRaw(DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY)
            );
            return voters;
        } catch (e) {
            throw new DatabaseError(e);
        }
    }

    async getVotersCountByAddress({ filters = {}, constituency_number_id, account_id, sno, epic, page_no, limit }, trxProvider = null) {
        try {
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            const voters = await this.handleQuery(queryBuilder
                .table(getVotersTableName({ constituency_number_id }))
                .select(DB_TABLE.VOTERS.COLUMNS.ADDRESS.KEY)
                .count({ count: '*' })
                .where(function() {
                  if (filters?.[FILTERS_LIST.polling_station_ids]?.length > 0) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY} IN (SELECT ${DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY} FROM ${DB_TABLE.POLLING_STATION.TABLE_NAME} WHERE ${DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY} IN (${filters[FILTERS_LIST.polling_station_ids].join(',')}) AND ${DB_TABLE.POLLING_STATION.COLUMNS.IS_DELETED.KEY}=false)`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.voter_name]?.trim()?.length > 0 || filters?.[FILTERS_LIST.voter_address]?.trim()?.length > 0 || filters?.[FILTERS_LIST.voter_epic]?.trim()?.length > 0) {
                    this.where(queryBuilder.raw(`(${[
                        filters?.[FILTERS_LIST.voter_name]?.trim()?.length > 0 ? `${DB_TABLE.VOTERS.COLUMNS.NAME.KEY} ILIKE '%${filters[FILTERS_LIST.voter_name].trim()}%'` : '',
                        filters?.[FILTERS_LIST.voter_address]?.trim()?.length > 0 ? `TRIM(${DB_TABLE.VOTERS.COLUMNS.ADDRESS.KEY}) = '${filters[FILTERS_LIST.voter_address].trim()}'` : '',
                        filters?.[FILTERS_LIST.voter_epic]?.trim()?.length > 0 ? `${DB_TABLE.VOTERS.COLUMNS.EPIC.KEY} ILIKE '%${filters[FILTERS_LIST.voter_epic].trim()}%'` : '',
                      ].filter(val => val.length > 0).join(' OR ')})`)
                    );
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.voter_opinions]?.length > 0) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE ${DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY} IN (${filters[FILTERS_LIST.voter_opinions].map(opinion => `'${opinion}'`).join(', ')}) AND ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false)`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.ID.KEY, filters[FILTERS_LIST.voter_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_genders]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.GENDER.KEY, filters[FILTERS_LIST.voter_genders]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.part_nos]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY, filters[FILTERS_LIST.part_nos]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.is_voter_approached] === false) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} NOT IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false)`));
                  } else if (filters?.[FILTERS_LIST.is_voter_approached] === true) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false)`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_castes]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.CASTE.KEY, filters[FILTERS_LIST.voter_castes]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_religions]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.RELIGION.KEY, filters[FILTERS_LIST.voter_religions]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.from_voter_age] && filters?.[FILTERS_LIST.to_voter_age]) {
                    this.whereBetween(DB_TABLE.VOTERS.COLUMNS.AGE.KEY, [
                      filters[FILTERS_LIST.from_voter_age], filters[FILTERS_LIST.to_voter_age]
                    ]);
                  } else if (filters?.[FILTERS_LIST.from_voter_age]) {
                    this.where(DB_TABLE.VOTERS.COLUMNS.AGE.KEY, '>=', filters[FILTERS_LIST.from_voter_age]);
                  } else if (filters?.[FILTERS_LIST.to_voter_age]) {
                      this.where(DB_TABLE.VOTERS.COLUMNS.AGE.KEY, '<=', filters[FILTERS_LIST.to_voter_age]);
                    } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(this.whereStatement({
                    ...(sno ? {[DB_TABLE.VOTERS.COLUMNS.SNO.KEY]: sno} : {}),
                    ...(epic ? {[DB_TABLE.VOTERS.COLUMNS.EPIC.KEY]: epic} : {}),
                    [DB_TABLE.VOTERS.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                    [DB_TABLE.VOTERS.COLUMNS.IS_DELETED.KEY]: false,
                }))
                .where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ADDRESS.KEY} NOT IN (SELECT DISTINCT ${DB_TABLE.VOTERS.COLUMNS.ADDRESS.KEY} FROM ${getVotersTableName({ constituency_number_id })} ORDER BY ${DB_TABLE.VOTERS.COLUMNS.ADDRESS.KEY} ASC LIMIT ${(page_no - 1) * limit})`))
                .groupByRaw(DB_TABLE.VOTERS.COLUMNS.ADDRESS.KEY)
                .orderBy(DB_TABLE.VOTERS.COLUMNS.ADDRESS.KEY, 'asc')
                .offset((page_no - 1) * limit)
                .limit(limit)
            );
            return voters;
        } catch (e) {
            throw new DatabaseError(e);
        }
    }

    async getAddressCount({ filters = {}, constituency_number_id, account_id, sno, epic }, trxProvider = null) {
        try {
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            const voters = await this.handleQuery(queryBuilder
                .table(getVotersTableName({ constituency_number_id }))
                .select(DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY)
                .countDistinct({
                  count: DB_TABLE.VOTERS.COLUMNS.ADDRESS.KEY
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.polling_station_ids]?.length > 0) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY} IN (SELECT ${DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY} FROM ${DB_TABLE.POLLING_STATION.TABLE_NAME} WHERE ${DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY} IN (${filters[FILTERS_LIST.polling_station_ids].join(',')}) AND ${DB_TABLE.POLLING_STATION.COLUMNS.IS_DELETED.KEY}=false)`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.voter_name]?.trim()?.length > 0 || filters?.[FILTERS_LIST.voter_address]?.trim()?.length > 0 || filters?.[FILTERS_LIST.voter_epic]?.trim()?.length > 0) {
                    this.where(queryBuilder.raw(`(${[
                        filters?.[FILTERS_LIST.voter_name]?.trim()?.length > 0 ? `${DB_TABLE.VOTERS.COLUMNS.NAME.KEY} ILIKE '%${filters[FILTERS_LIST.voter_name].trim()}%'` : '',
                        filters?.[FILTERS_LIST.voter_address]?.trim()?.length > 0 ? `TRIM(${DB_TABLE.VOTERS.COLUMNS.ADDRESS.KEY}) = '${filters[FILTERS_LIST.voter_address].trim()}'` : '',
                        filters?.[FILTERS_LIST.voter_epic]?.trim()?.length > 0 ? `${DB_TABLE.VOTERS.COLUMNS.EPIC.KEY} ILIKE '%${filters[FILTERS_LIST.voter_epic].trim()}%'` : '',
                      ].filter(val => val.length > 0).join(' OR ')})`)
                    );
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.ID.KEY, filters[FILTERS_LIST.voter_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_genders]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.GENDER.KEY, filters[FILTERS_LIST.voter_genders]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.part_nos]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY, filters[FILTERS_LIST.part_nos]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.voter_opinions]?.length > 0) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE ${DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY} IN (${filters[FILTERS_LIST.voter_opinions].map(opinion => `'${opinion}'`).join(', ')}) AND ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false)`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.is_voter_approached] === false) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} NOT IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false)`));
                  } else if (filters?.[FILTERS_LIST.is_voter_approached] === true) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false)`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_castes]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.CASTE.KEY, filters[FILTERS_LIST.voter_castes]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_religions]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.RELIGION.KEY, filters[FILTERS_LIST.voter_religions]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.from_voter_age] && filters?.[FILTERS_LIST.to_voter_age]) {
                    this.whereBetween(DB_TABLE.VOTERS.COLUMNS.AGE.KEY, [
                      filters[FILTERS_LIST.from_voter_age], filters[FILTERS_LIST.to_voter_age]
                    ]);
                  } else if (filters?.[FILTERS_LIST.from_voter_age]) {
                    this.where(DB_TABLE.VOTERS.COLUMNS.AGE.KEY, '>=', filters[FILTERS_LIST.from_voter_age]);
                  } else if (filters?.[FILTERS_LIST.to_voter_age]) {
                      this.where(DB_TABLE.VOTERS.COLUMNS.AGE.KEY, '<=', filters[FILTERS_LIST.to_voter_age]);
                    } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(this.whereStatement({
                    ...(sno ? {[DB_TABLE.VOTERS.COLUMNS.SNO.KEY]: sno} : {}),
                    ...(epic ? {[DB_TABLE.VOTERS.COLUMNS.EPIC.KEY]: epic} : {}),
                    [DB_TABLE.VOTERS.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                    [DB_TABLE.VOTERS.COLUMNS.IS_DELETED.KEY]: false,
                }))
                .groupBy(DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY)
            );
            return voters;
        } catch (e) {
            throw new DatabaseError(e);
        }
    }

    async truncateVotersAndDataCollection({ constituency_number_id, account_id }, trxProvider = null) {
      try {
          const queryBuilder = await this.getQueryBuilder(trxProvider);

          const voters = await this.handleQuery(queryBuilder
              .table(getVotersTableName({ constituency_number_id }))
              .truncate()
          );

          const dataCollection = await this.handleQuery(queryBuilder
            .table(getDataCollectionTableName({ constituency_number_id, account_id }))
            .truncate()
          );

          return voters && dataCollection;
      } catch (e) {
          throw new DatabaseError(e);
      }
    }

    async getVotersEPICList({ constituency_number_id, voterIds }, trxProvider = null) {
      try {
          const queryBuilder = await this.getQueryBuilder(trxProvider);

          const voters = await this.handleQuery(queryBuilder
              .table(getVotersTableName({ constituency_number_id }))
              .select(
                DB_TABLE.VOTERS.COLUMNS.ID.KEY,
                DB_TABLE.VOTERS.COLUMNS.EPIC.KEY
              )
              .whereIn(
                DB_TABLE.VOTERS.COLUMNS.ID.KEY, voterIds
              )
              .where(this.whereStatement({
                  [DB_TABLE.VOTERS.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                  [DB_TABLE.VOTERS.COLUMNS.IS_DELETED.KEY]: false,
              }))
          );
          return voters;
      } catch (e) {
          throw new DatabaseError(e);
      }
    }

    async getVotersByFilter({ filters = {}, constituency_number_id, account_id, sno, epic, page_no = 1, limit = 50 }, trxProvider = null) {
        try {
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            const voters = await this.handleQuery(queryBuilder
                .table(getVotersTableName({ constituency_number_id }))
                .where(function() {
                  if (filters?.[FILTERS_LIST.volunteer_ids]?.length > 0) {
                    if (filters?.[FILTERS_LIST.list_type] === LIST_TYPE.TOTAL_VOTERS) {
                      this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY} IN (SELECT ${DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY} FROM ${DB_TABLE.POLLING_STATION.TABLE_NAME} WHERE ${DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY} IN (SELECT ${DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY} FROM ${DB_TABLE.USERS.TABLE_NAME} WHERE ${DB_TABLE.USERS.COLUMNS.ID.KEY} IN (${filters[FILTERS_LIST.volunteer_ids].join(',')})) AND ${DB_TABLE.POLLING_STATION.COLUMNS.IS_DELETED.KEY}=false)`));
                    } else {
                      this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY} IN (${filters[FILTERS_LIST.volunteer_ids].join(',')}) AND ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false)`));
                    }
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.voter_opinions]?.length > 0) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE ${DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY} IN ('${filters[FILTERS_LIST.voter_opinions].join("','")}') AND ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false)`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.is_voter_mobile_number] === true) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE ${DB_TABLE.DATA_COLLECTION.COLUMNS.MOBILE_NUMBER.KEY} IS NOT NULL AND ${DB_TABLE.DATA_COLLECTION.COLUMNS.MOBILE_NUMBER.KEY} != '' AND ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false) OR (${DB_TABLE.VOTERS.COLUMNS.MOBILE_NUMBER.KEY} != '' AND ${DB_TABLE.VOTERS.COLUMNS.MOBILE_NUMBER.KEY} IS NOT NULL)`));
                  } else if (filters?.[FILTERS_LIST.is_voter_mobile_number] === false) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE (${DB_TABLE.DATA_COLLECTION.COLUMNS.MOBILE_NUMBER.KEY} IS NULL OR ${DB_TABLE.DATA_COLLECTION.COLUMNS.MOBILE_NUMBER.KEY} = '') AND ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false) AND (${DB_TABLE.VOTERS.COLUMNS.MOBILE_NUMBER.KEY} = '' OR ${DB_TABLE.VOTERS.COLUMNS.MOBILE_NUMBER.KEY} IS NULL)`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.is_voter_approached] === false) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} NOT IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false)`));
                  } else if (filters?.[FILTERS_LIST.is_voter_approached] === true) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false)`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.is_voter_voted] === true) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} IN (SELECT ${DB_TABLE.LIVE_VOTING.COLUMNS.VOTER_ID.KEY} FROM ${getLiveVotingTableName({ constituency_number_id, account_id })} WHERE is_deleted=false)`));
                  } else if (filters?.[FILTERS_LIST.is_voter_voted] === false) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} NOT IN (SELECT ${DB_TABLE.LIVE_VOTING.COLUMNS.VOTER_ID.KEY} FROM ${getLiveVotingTableName({ constituency_number_id, account_id })} WHERE is_deleted=false)`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.polling_station_ids]?.length > 0) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY} IN (SELECT ${DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY} FROM ${DB_TABLE.POLLING_STATION.TABLE_NAME} WHERE ${DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY} IN (${filters[FILTERS_LIST.polling_station_ids].join(',')}) AND ${DB_TABLE.POLLING_STATION.COLUMNS.IS_DELETED.KEY}=false)`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.sno] > 0) {
                    this.where({[DB_TABLE.VOTERS.COLUMNS.SNO.KEY]: filters[FILTERS_LIST.sno]});
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.voter_name]?.trim()?.length > 0 || filters?.[FILTERS_LIST.voter_address]?.trim()?.length > 0 || filters?.[FILTERS_LIST.voter_epic]?.trim()?.length > 0) {
                    this.where(queryBuilder.raw(`(${[
                        filters?.[FILTERS_LIST.voter_name]?.trim()?.length > 0 ? `${DB_TABLE.VOTERS.COLUMNS.NAME.KEY} ILIKE '%${filters[FILTERS_LIST.voter_name].trim()}%'` : '',
                        filters?.[FILTERS_LIST.voter_address]?.trim()?.length > 0 ? `TRIM(${DB_TABLE.VOTERS.COLUMNS.ADDRESS.KEY}) = '${filters[FILTERS_LIST.voter_address].trim()}'` : '',
                        filters?.[FILTERS_LIST.voter_epic]?.trim()?.length > 0 ? `${DB_TABLE.VOTERS.COLUMNS.EPIC.KEY} ILIKE '%${filters[FILTERS_LIST.voter_epic].trim()}%'` : '',
                      ].filter(val => val.length > 0).join(' OR ')})`)
                    );
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.ID.KEY, filters[FILTERS_LIST.voter_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_genders]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.GENDER.KEY, filters[FILTERS_LIST.voter_genders]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.part_nos]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY, filters[FILTERS_LIST.part_nos]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_castes]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.CASTE.KEY, filters[FILTERS_LIST.voter_castes]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_religions]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.RELIGION.KEY, filters[FILTERS_LIST.voter_religions]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.from_voter_age] && filters?.[FILTERS_LIST.to_voter_age]) {
                    this.whereBetween(DB_TABLE.VOTERS.COLUMNS.AGE.KEY, [
                      filters[FILTERS_LIST.from_voter_age], filters[FILTERS_LIST.to_voter_age]
                    ]);
                  } else if (filters?.[FILTERS_LIST.from_voter_age]) {
                    this.where(DB_TABLE.VOTERS.COLUMNS.AGE.KEY, '>=', filters[FILTERS_LIST.from_voter_age]);
                  } else if (filters?.[FILTERS_LIST.to_voter_age]) {
                      this.where(DB_TABLE.VOTERS.COLUMNS.AGE.KEY, '<=', filters[FILTERS_LIST.to_voter_age]);
                    } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(this.whereStatement({
                    ...(sno ? {[DB_TABLE.VOTERS.COLUMNS.SNO.KEY]: sno} : {}),
                    ...(epic ? {[DB_TABLE.VOTERS.COLUMNS.EPIC.KEY]: epic} : {}),
                    [DB_TABLE.VOTERS.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                    [DB_TABLE.VOTERS.COLUMNS.IS_DELETED.KEY]: false,
                }))
                .orderBy(DB_TABLE.VOTERS.COLUMNS.SNO.KEY, 'asc')
                .offset((page_no - 1) * limit)
                .limit(limit)
            );
            return voters;
        } catch (e) {
            throw new DatabaseError(e);
        }
    }

    async getVotersAddressListByFilter({ filters = {}, constituency_number_id, account_id, sno, epic, page_no = 1, limit = 50 }, trxProvider = null) {
        try {
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            const voters = await this.handleQuery(queryBuilder
                .table(getVotersTableName({ constituency_number_id }))
                .distinct(DB_TABLE.VOTERS.COLUMNS.ADDRESS.KEY)
                .select(
                    DB_TABLE.VOTERS.COLUMNS.ADDRESS.KEY
                )
                .where(function() {
                  if (filters?.[FILTERS_LIST.volunteer_ids]?.length > 0) {
                    if (filters?.[FILTERS_LIST.list_type] === LIST_TYPE.TOTAL_VOTERS) {
                      this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY} IN (SELECT ${DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY} FROM ${DB_TABLE.POLLING_STATION.TABLE_NAME} WHERE ${DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY} IN (SELECT ${DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY} FROM ${DB_TABLE.USERS.TABLE_NAME} WHERE ${DB_TABLE.USERS.COLUMNS.ID.KEY} IN (${filters[FILTERS_LIST.volunteer_ids].join(',')})) AND ${DB_TABLE.POLLING_STATION.COLUMNS.IS_DELETED.KEY}=false)`));
                    } else {
                      this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY} IN (${filters[FILTERS_LIST.volunteer_ids].join(',')}) AND ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false)`));
                    }
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.voter_opinions]?.length > 0) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE ${DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY} IN ('${filters[FILTERS_LIST.voter_opinions].join("','")}') AND ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false)`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.is_voter_mobile_number] === true) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE ${DB_TABLE.DATA_COLLECTION.COLUMNS.MOBILE_NUMBER.KEY} IS NOT NULL AND ${DB_TABLE.DATA_COLLECTION.COLUMNS.MOBILE_NUMBER.KEY} != '' AND ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false) OR (${DB_TABLE.VOTERS.COLUMNS.MOBILE_NUMBER.KEY} != '' AND ${DB_TABLE.VOTERS.COLUMNS.MOBILE_NUMBER.KEY} IS NOT NULL)`));
                  } else if (filters?.[FILTERS_LIST.is_voter_mobile_number] === false) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE (${DB_TABLE.DATA_COLLECTION.COLUMNS.MOBILE_NUMBER.KEY} IS NULL OR ${DB_TABLE.DATA_COLLECTION.COLUMNS.MOBILE_NUMBER.KEY} = '') AND ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false) AND (${DB_TABLE.VOTERS.COLUMNS.MOBILE_NUMBER.KEY} = '' OR ${DB_TABLE.VOTERS.COLUMNS.MOBILE_NUMBER.KEY} IS NULL)`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.is_voter_approached] === false) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} NOT IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false)`));
                  } else if (filters?.[FILTERS_LIST.is_voter_approached] === true) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} IN (SELECT ${DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY} FROM ${getDataCollectionTableName({ constituency_number_id, account_id })} WHERE ${DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY}=false)`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.is_voter_voted] === true) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} IN (SELECT ${DB_TABLE.LIVE_VOTING.COLUMNS.VOTER_ID.KEY} FROM ${getLiveVotingTableName({ constituency_number_id, account_id })} WHERE is_deleted=false)`));
                  } else if (filters?.[FILTERS_LIST.is_voter_voted] === false) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.ID.KEY} NOT IN (SELECT ${DB_TABLE.LIVE_VOTING.COLUMNS.VOTER_ID.KEY} FROM ${getLiveVotingTableName({ constituency_number_id, account_id })} WHERE is_deleted=false)`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.polling_station_ids]?.length > 0) {
                    this.where(queryBuilder.raw(`${DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY} IN (SELECT ${DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY} FROM ${DB_TABLE.POLLING_STATION.TABLE_NAME} WHERE ${DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY} IN (${filters[FILTERS_LIST.polling_station_ids].join(',')}) AND ${DB_TABLE.POLLING_STATION.COLUMNS.IS_DELETED.KEY}=false)`));
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.sno] > 0) {
                    this.where({[DB_TABLE.VOTERS.COLUMNS.SNO.KEY]: filters[FILTERS_LIST.sno]});
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.voter_name]?.trim()?.length > 0 || filters?.[FILTERS_LIST.voter_address]?.trim()?.length > 0 || filters?.[FILTERS_LIST.voter_epic]?.trim()?.length > 0) {
                    this.where(queryBuilder.raw(`(${[
                        filters?.[FILTERS_LIST.voter_name]?.trim()?.length > 0 ? `${DB_TABLE.VOTERS.COLUMNS.NAME.KEY} ILIKE '%${filters[FILTERS_LIST.voter_name].trim()}%'` : '',
                        filters?.[FILTERS_LIST.voter_address]?.trim()?.length > 0 ? `TRIM(${DB_TABLE.VOTERS.COLUMNS.ADDRESS.KEY}) = '${filters[FILTERS_LIST.voter_address].trim()}'` : '',
                        filters?.[FILTERS_LIST.voter_epic]?.trim()?.length > 0 ? `${DB_TABLE.VOTERS.COLUMNS.EPIC.KEY} ILIKE '%${filters[FILTERS_LIST.voter_epic].trim()}%'` : '',
                      ].filter(val => val.length > 0).join(' OR ')})`)
                    );
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.ID.KEY, filters[FILTERS_LIST.voter_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_genders]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.GENDER.KEY, filters[FILTERS_LIST.voter_genders]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.part_nos]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY, filters[FILTERS_LIST.part_nos]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_castes]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.CASTE.KEY, filters[FILTERS_LIST.voter_castes]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.voter_religions]?.length > 0) {
                      this.whereIn(DB_TABLE.VOTERS.COLUMNS.RELIGION.KEY, filters[FILTERS_LIST.voter_religions]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                  if (filters?.[FILTERS_LIST.from_voter_age] && filters?.[FILTERS_LIST.to_voter_age]) {
                    this.whereBetween(DB_TABLE.VOTERS.COLUMNS.AGE.KEY, [
                      filters[FILTERS_LIST.from_voter_age], filters[FILTERS_LIST.to_voter_age]
                    ]);
                  } else if (filters?.[FILTERS_LIST.from_voter_age]) {
                    this.where(DB_TABLE.VOTERS.COLUMNS.AGE.KEY, '>=', filters[FILTERS_LIST.from_voter_age]);
                  } else if (filters?.[FILTERS_LIST.to_voter_age]) {
                      this.where(DB_TABLE.VOTERS.COLUMNS.AGE.KEY, '<=', filters[FILTERS_LIST.to_voter_age]);
                    } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
                })
                .where(this.whereStatement({
                    ...(sno ? {[DB_TABLE.VOTERS.COLUMNS.SNO.KEY]: sno} : {}),
                    ...(epic ? {[DB_TABLE.VOTERS.COLUMNS.EPIC.KEY]: epic} : {}),
                    [DB_TABLE.VOTERS.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                    [DB_TABLE.VOTERS.COLUMNS.IS_DELETED.KEY]: false,
                }))
                .orderBy(DB_TABLE.VOTERS.COLUMNS.ADDRESS.KEY, 'asc')
                .offset((page_no - 1) * limit)
                .limit(limit)
            );
            return voters;
        } catch (e) {
            throw new DatabaseError(e);
        }
    }
}

module.exports = VotersModel;
