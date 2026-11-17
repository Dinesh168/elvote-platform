const Db = require("./libs/Db");
const BaseModel = require("./libs/BaseModel")
const DatabaseError = require("../errorhandlers/DatabaseError");
const { DB_TABLE, getVotersTableName, PUBLIC_SCHEMA, FILTERS_LIST, getPollingStationPartyTableName, getDataCollectionTableName } = require("./libs/dbConstants");
const Utility = require("../businesslogic/Utility");

class ConstituencyModel extends BaseModel {
    constructor() {
        super(null);
    }

    async upsertConstituency({ name, constituency_number, other_data, is_deleted }, trxProvider = null) {
        try {

            const _constituency = await this.getConstituency({ constituency_number }, trxProvider);
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            if (_constituency) {
                const constituency = await this.handleQuery(queryBuilder
                    .table(DB_TABLE.CONSTITUENCY.TABLE_NAME)
                    .where(this.whereStatement({
                        [DB_TABLE.CONSTITUENCY.COLUMNS.CONSTITUENCY_NUMBER.KEY]: constituency_number
                    }))
                    .update(this.getDefinedUpdates({
                        [DB_TABLE.CONSTITUENCY.COLUMNS.NAME.KEY]: name,
                        [DB_TABLE.CONSTITUENCY.COLUMNS.OTHER_DATA.KEY]: other_data,
                        [DB_TABLE.CONSTITUENCY.COLUMNS.IS_DELETED.KEY]: is_deleted,
                    }), [`${DB_TABLE.CONSTITUENCY.COLUMNS.ID.KEY}`]));

                return constituency?.[0];
            }

            
            const constituency = await this.handleQuery(queryBuilder
                .table(DB_TABLE.CONSTITUENCY.TABLE_NAME)
                .insert(this.getDefinedUpdates({
                    [DB_TABLE.CONSTITUENCY.COLUMNS.NAME.KEY]: name,
                    [DB_TABLE.CONSTITUENCY.COLUMNS.CONSTITUENCY_NUMBER.KEY]: constituency_number,
                    [DB_TABLE.CONSTITUENCY.COLUMNS.OTHER_DATA.KEY]: other_data,
                    [DB_TABLE.CONSTITUENCY.COLUMNS.IS_DELETED.KEY]: is_deleted,
                }), [
                        `${DB_TABLE.CONSTITUENCY.COLUMNS.ID.KEY}`, 
                    ]));

            if (constituency?.[0]) {
                const votersTable = await this.handleQuery(queryBuilder.schema.withSchema(PUBLIC_SCHEMA)
                    .createTable(getVotersTableName({ constituency_number_id: constituency_number }), function (table) {
                        table.increments();
                        table.smallint(DB_TABLE.VOTERS.COLUMNS.SNO.KEY).unsigned().notNullable();
                        table.string(DB_TABLE.VOTERS.COLUMNS.NAME.KEY).notNullable();
                        table.smallint(DB_TABLE.VOTERS.COLUMNS.AGE.KEY).unsigned();
                        table.specificType(DB_TABLE.VOTERS.COLUMNS.GENDER.KEY, 'char(1)');
                        table.string(DB_TABLE.VOTERS.COLUMNS.RELATIVE_NAME.KEY);
                        table.varchar(DB_TABLE.VOTERS.COLUMNS.RELATIVE_RELATION.KEY, 20);
                        table.varchar(DB_TABLE.VOTERS.COLUMNS.EPIC.KEY, 18).notNullable().unique();
                        table.string(DB_TABLE.VOTERS.COLUMNS.ADDRESS.KEY);
                        table.smallint(DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY).unsigned().notNullable();
                        table.smallint(DB_TABLE.VOTERS.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY).unsigned().notNullable();
                        table.varchar(DB_TABLE.VOTERS.COLUMNS.MOBILE_NUMBER.KEY, 15);
                        table.varchar(DB_TABLE.VOTERS.COLUMNS.CASTE.KEY, 30);
                        table.specificType(DB_TABLE.VOTERS.COLUMNS.RELIGION.KEY, 'char(1)');
                        table.boolean(DB_TABLE.VOTERS.COLUMNS.IS_DELETED.KEY).defaultTo(false);
                        table.timestamps(true, true, false);

                        // table.unique([
                        //     DB_TABLE.VOTERS.COLUMNS.SNO.KEY, 
                        //     DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY, 
                        //     DB_TABLE.VOTERS.COLUMNS.IS_DELETED.KEY
                        // ], {
                        //     indexName: `indx_unique_VOTERS_${constituency_number}_sno_partno_isDeleted`,
                        //     predicate: queryBuilder.whereRaw(`${DB_TABLE.VOTERS.COLUMNS.IS_DELETED.KEY}=false`)
                        // })

                        table.index(DB_TABLE.VOTERS.COLUMNS.SNO.KEY);
                        table.index(DB_TABLE.VOTERS.COLUMNS.NAME.KEY);
                        table.index(DB_TABLE.VOTERS.COLUMNS.AGE.KEY);
                        table.index(DB_TABLE.VOTERS.COLUMNS.GENDER.KEY);
                        table.index(DB_TABLE.VOTERS.COLUMNS.PART_NO.KEY);
                        table.index(DB_TABLE.VOTERS.COLUMNS.CASTE.KEY);
                        table.index(DB_TABLE.VOTERS.COLUMNS.RELIGION.KEY);
                    }));
            }

            return constituency?.[0];

        } catch (e) {
            throw new DatabaseError(e);
        }
    }

    async getConstituency({ constituency_number }, trxProvider = null) {
        try {
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            const constituency = await this.handleQuery(queryBuilder
                .table(DB_TABLE.CONSTITUENCY.TABLE_NAME)
                .where(this.whereStatement({ 
                    [DB_TABLE.CONSTITUENCY.COLUMNS.CONSTITUENCY_NUMBER.KEY]: constituency_number,
                    [DB_TABLE.CONSTITUENCY.COLUMNS.IS_DELETED.KEY]: false,
                })));
            return constituency.length > 0 ? constituency[0] : null;
        } catch (e) {
            throw new DatabaseError(e);
        }
    }

    async getConstituencyList({ account_id }, trxProvider = null) {
        try {
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            const constituency_account_maps = await this.handleQuery(queryBuilder
                .table(DB_TABLE.CONSTITUENCY_ACCOUNT_MAPPING.TABLE_NAME)
                .where(this.whereStatement({ 
                    [DB_TABLE.CONSTITUENCY_ACCOUNT_MAPPING.COLUMNS.ACCOUNT_ID.KEY]: account_id,
                    [DB_TABLE.CONSTITUENCY_ACCOUNT_MAPPING.COLUMNS.IS_DELETED.KEY]: false,
                })));

            const constituency = await this.handleQuery(queryBuilder
                .table(DB_TABLE.CONSTITUENCY.TABLE_NAME)
                .whereIn(DB_TABLE.CONSTITUENCY.COLUMNS.CONSTITUENCY_NUMBER.KEY, constituency_account_maps.map(cam => cam[DB_TABLE.CONSTITUENCY_ACCOUNT_MAPPING.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]))
                .where(this.whereStatement({ 
                    [DB_TABLE.CONSTITUENCY.COLUMNS.IS_DELETED.KEY]: false,
                })));
            return constituency;
        } catch (e) {
            throw new DatabaseError(e);
        }
    }

    async insertPollingStations(pollingStationsList, trxProvider = null) {
        try {
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            const pollingStation = await this.handleQuery(queryBuilder
                .table(DB_TABLE.POLLING_STATION.TABLE_NAME)
                .insert(pollingStationsList));

            return pollingStation ? true : false;
        } catch (e) {
            throw new DatabaseError(e);
        }
    }

    async upsertPollingStation({ 
        id, 
        name, 
        part_no,
        address,
        constituency_number_id, 
        is_deleted 
    }, trxProvider = null) {
        try {
            const queryBuilder = await this.getQueryBuilder(trxProvider);
            if (id) {
                const pollingStation = await this.handleQuery(queryBuilder
                    .table(DB_TABLE.POLLING_STATION.TABLE_NAME)
                    .where(this.whereStatement({
                        [DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY]: id
                    }))
                    .update(this.getDefinedUpdates({
                        [DB_TABLE.POLLING_STATION.COLUMNS.NAME.KEY]: name,
                        [DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY]: part_no,
                        [DB_TABLE.POLLING_STATION.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                        [DB_TABLE.POLLING_STATION.COLUMNS.ADDRESS.KEY]: address,
                        [DB_TABLE.POLLING_STATION.COLUMNS.IS_DELETED.KEY]: is_deleted,
                    }), [`${DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY}`]));

                return pollingStation?.[0];
            }

            
            const pollingStation = await this.handleQuery(queryBuilder
                .table(DB_TABLE.POLLING_STATION.TABLE_NAME)
                .insert(this.getDefinedUpdates({
                    [DB_TABLE.POLLING_STATION.COLUMNS.NAME.KEY]: name,
                    [DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY]: part_no,
                    [DB_TABLE.POLLING_STATION.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                    [DB_TABLE.POLLING_STATION.COLUMNS.ADDRESS.KEY]: address,
                    [DB_TABLE.POLLING_STATION.COLUMNS.IS_DELETED.KEY]: is_deleted,
                }), [
                        `${DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY}`, 
                    ]));

            return pollingStation?.[0];

        } catch (e) {
            throw new DatabaseError(e);
        }
    }

    async getPollingStationsPartyList({ part_ids, constituency_number_id, account_id }, trxProvider = null) {
        
        try {
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            const pollingStationsPartyTableExists = await this.handleQuery(queryBuilder
                .raw(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${getPollingStationPartyTableName({ constituency_number_id, account_id })}')`)
            );

            if (pollingStationsPartyTableExists.rows[0].exists) {
                const pollingStationsParty = await this.handleQuery(queryBuilder
                    .table(getPollingStationPartyTableName({ constituency_number_id, account_id }))
                    .select(
                        DB_TABLE.POLLING_STATION_FOR_PARTY.COLUMNS.PART_NO.KEY,
                        DB_TABLE.POLLING_STATION_FOR_PARTY.COLUMNS.BOOTH_STRENGTH.KEY,
                    )
                    .whereIn(DB_TABLE.POLLING_STATION_FOR_PARTY.COLUMNS.PART_NO.KEY, part_ids)
                    .where(this.whereStatement({ 
                        [DB_TABLE.POLLING_STATION_FOR_PARTY.COLUMNS.IS_DELETED.KEY]: false,
                    }))
                );
                return pollingStationsParty;
            }

            return [];

            
        } catch (e) {
            throw new DatabaseError(e);
        }
    }

    async getPollingStationsMinimalList({ filters, constituency_number_id }, trxProvider = null) {
        try {
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            const pollingStations = await this.handleQuery(queryBuilder
                .table(DB_TABLE.POLLING_STATION.TABLE_NAME)
                .where(function() {
                    if (filters?.[FILTERS_LIST.part_nos]?.length > 0) {
                      this.whereIn(DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY, filters[FILTERS_LIST.part_nos]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .select(
                    DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY,
                    DB_TABLE.POLLING_STATION.COLUMNS.NAME.KEY,
                    DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY,
                )
                .where(this.whereStatement({ 
                    [DB_TABLE.POLLING_STATION.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                    [DB_TABLE.POLLING_STATION.COLUMNS.IS_DELETED.KEY]: false,
                }))
                .orderBy(DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY, "asc")
            );
            return pollingStations;
        } catch (e) {
            throw new DatabaseError(e);
        }
    }

    async getPollingStationsByFilter({ filters = {}, constituency_number_id, page_no = 1, limit = 50 }, trxProvider = null) {
        try {
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            const pollingStations = await this.handleQuery(queryBuilder
                .table(DB_TABLE.POLLING_STATION.TABLE_NAME)
                .where(function() {
                    if (filters?.[FILTERS_LIST.polling_station_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY, filters[FILTERS_LIST.polling_station_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.part_nos]?.length > 0) {
                      this.whereIn(DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY, filters[FILTERS_LIST.part_nos]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.polling_station_name]?.trim()?.length > 0) {
                      this.whereILike(DB_TABLE.POLLING_STATION.COLUMNS.NAME.KEY, `%${filters[FILTERS_LIST.polling_station_name].trim()}%`);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(this.whereStatement({ 
                    ...(constituency_number_id ? {[DB_TABLE.POLLING_STATION.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id} : {}),
                    [DB_TABLE.POLLING_STATION.COLUMNS.IS_DELETED.KEY]: false,
                }))
                .orderBy(DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY, "asc")
                .offset((page_no - 1) * limit)
                .limit(limit)
            );
            return pollingStations;
        } catch (e) {
            throw new DatabaseError(e);
        }
    }

    async insertPollingStationsAndVoters({pollingStationsList, boothStrengthList, account_id, votersList, constituency_number_id, approachedList}, trxProvider = null) {
        try {
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            let volunteersList = {};
            let pollingStation = true;
            let boothStrength = true;

            const voters = await this.handleQuery(queryBuilder
                .table(getVotersTableName({ constituency_number_id }))
                .insert(votersList)
                // Skip voters already uploaded so a failed upload can be retried with the same file
                .onConflict(DB_TABLE.VOTERS.COLUMNS.EPIC.KEY)
                .ignore());

            if (Object.keys(approachedList).length > 0) {
                let vList = await this.handleQuery(queryBuilder
                    .table(DB_TABLE.USERS.TABLE_NAME)
                    .select(
                        DB_TABLE.USERS.COLUMNS.ID.KEY,
                        DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY,
                    )
                    .where(this.whereStatement({ 
                        [DB_TABLE.USERS.COLUMNS.ACCOUNT_ID.KEY]: account_id,
                        [DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.KEY]: DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.VALUES.APPROVED,
                        [DB_TABLE.USERS.COLUMNS.ROLE.KEY]: DB_TABLE.USERS.COLUMNS.ROLE.VALUES.VOLUNTEER,
                        [DB_TABLE.USERS.COLUMNS.IS_DELETED.KEY]: false,
                    }))
                );
                let pList = await this.handleQuery(queryBuilder
                    .table(DB_TABLE.POLLING_STATION.TABLE_NAME)
                    .select(
                        DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY,
                        DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY,
                    )
                    .whereIn(DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY, [...new Set(vList.map(it => it[DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY]))])
                    .where(this.whereStatement({ 
                        [DB_TABLE.POLLING_STATION.COLUMNS.IS_DELETED.KEY]: false,
                    }))
                );

                vList.forEach(vL => {
                    const pL = pList.find(it => it[DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY] === vL[DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY]);
                    volunteersList[pL[DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY]] = vL[DB_TABLE.USERS.COLUMNS.ID.KEY];

                });

                const partNoList = pList.map(pL => pL[DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY]);
                const pSToInsert = pollingStationsList.filter(psl => !partNoList.includes(parseInt(psl.part_no)) );
                const bSToInsert = boothStrengthList.filter(bsl => !partNoList.includes(parseInt(bsl.part_no)) );

                if (pSToInsert.length > 0) {
                    pollingStation = await this.handleQuery(queryBuilder
                        .table(DB_TABLE.POLLING_STATION.TABLE_NAME)
                        .insert(pSToInsert));
                }

                if (bSToInsert.length > 0) {
                    boothStrength = await this.handleQuery(queryBuilder
                        .table(getPollingStationPartyTableName({ constituency_number_id, account_id }))
                        .insert(bSToInsert));
                }

                let votersIds = await this.handleQuery(queryBuilder
                    .table(getVotersTableName({ constituency_number_id }))
                    .select(
                        DB_TABLE.VOTERS.COLUMNS.ID.KEY,
                        DB_TABLE.VOTERS.COLUMNS.EPIC.KEY,
                    )
                    .whereIn(
                        DB_TABLE.VOTERS.COLUMNS.EPIC.KEY, Object.keys(approachedList)
                    )
                    .where(this.whereStatement({ 
                        [DB_TABLE.VOTERS.COLUMNS.IS_DELETED.KEY]: false,
                    }))
                );

                const dataCollectionList = votersIds.map(vI => {
                    const approachedListData = approachedList[vI[DB_TABLE.VOTERS.COLUMNS.EPIC.KEY]];
                    const volunteerId = volunteersList[approachedListData.part_no];

                    return this.getDefinedUpdates({
                        [DB_TABLE.DATA_COLLECTION.COLUMNS.VOLUNTEER_ID.KEY]: volunteerId,
                        [DB_TABLE.DATA_COLLECTION.COLUMNS.VOTER_ID.KEY]: vI[DB_TABLE.VOTERS.COLUMNS.ID.KEY],
                        [DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.KEY]: Utility.selectFromList(approachedListData.opinion, Object.values(DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.VALUES), DB_TABLE.DATA_COLLECTION.COLUMNS.OPINION.VALUES.OTHER),
                        [DB_TABLE.DATA_COLLECTION.COLUMNS.MOBILE_NUMBER.KEY]: approachedListData.collected_mobile && approachedListData.collected_mobile.length > 0 ? approachedListData.collected_mobile : undefined,
                        [DB_TABLE.DATA_COLLECTION.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id,
                        [DB_TABLE.DATA_COLLECTION.COLUMNS.ACCOUNT_ID.KEY]: account_id,
                        [DB_TABLE.DATA_COLLECTION.COLUMNS.IS_DELETED.KEY]: false,
                    })
                })

                await this.handleQuery(queryBuilder
                    .table(getDataCollectionTableName({ constituency_number_id, account_id }))
                    .insert(dataCollectionList));
            } else {
                const addedPollingStations = await this.handleQuery(queryBuilder
                    .table(DB_TABLE.POLLING_STATION.TABLE_NAME)
                    .select(DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY)
                    .whereIn(DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY, pollingStationsList.map(data => data.part_no))
                    .where(this.whereStatement({ 
                        [DB_TABLE.POLLING_STATION.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY]: constituency_number_id
                    }))
                );

                const addedPartsList = addedPollingStations.map(data => data[DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY]);
                const remainingPollingStations = pollingStationsList.filter(data => !addedPartsList.includes(parseInt(data.part_no)));

                if (remainingPollingStations.length > 0) {
                    pollingStation = await this.handleQuery(queryBuilder
                        .table(DB_TABLE.POLLING_STATION.TABLE_NAME)
                        .insert(remainingPollingStations));
    
                    boothStrength = await this.handleQuery(queryBuilder
                        .table(getPollingStationPartyTableName({ constituency_number_id, account_id }))
                        .insert(boothStrengthList.filter(data => !addedPartsList.includes(parseInt(data.part_no)))));
                }
            }

            
            
            

            

            return pollingStation && voters && boothStrength ? true : false;
        } catch (e) {
            throw new DatabaseError(e);
        }
    }

}

module.exports = ConstituencyModel;
