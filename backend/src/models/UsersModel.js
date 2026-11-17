const Db = require("./libs/Db");
const BaseModel = require("./libs/BaseModel")
const DatabaseError = require("./../errorhandlers/DatabaseError");
const { DB_TABLE, FILTERS_LIST } = require("./libs/dbConstants");

class UsersModel extends BaseModel {
    constructor() {
        super(null);
    }

    async upsertUser({ 
      uniqueUserId, 
      name, 
      mobile,
      email, 
      photo, 
      role,
      permissions_list,
      account_id,
      polling_station_id,
      account_approved_status, 
      is_deleted
    }, trxProvider = null) {
        try {

            const _user = uniqueUserId || email
                            ? await this.getUsersByFilter({ uniqueUserId, email }, trxProvider)
                            : null;
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            if (_user && _user.length > 0) {
                const user = await this.handleQuery(queryBuilder
                    .table(DB_TABLE.USERS.TABLE_NAME)
                    .where(this.whereStatement({
                        [DB_TABLE.USERS.COLUMNS.UNIQUE_ID.KEY]: _user[0][DB_TABLE.USERS.COLUMNS.UNIQUE_ID.KEY]
                    }))
                    .update(this.getDefinedUpdates({
                        [DB_TABLE.USERS.COLUMNS.NAME.KEY]: name,
                        [DB_TABLE.USERS.COLUMNS.EMAIL.KEY]: email,
                        [DB_TABLE.USERS.COLUMNS.MOBILE.KEY]: mobile,
                        [DB_TABLE.USERS.COLUMNS.PHOTO.KEY]: photo,
                        [DB_TABLE.USERS.COLUMNS.ROLE.KEY]: role,
                        [DB_TABLE.USERS.COLUMNS.PERMISSIONS_LIST.KEY]: permissions_list,
                        [DB_TABLE.USERS.COLUMNS.ACCOUNT_ID.KEY]: account_id,
                        [DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY]: polling_station_id,
                        [DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.KEY]: account_approved_status,
                        [DB_TABLE.USERS.COLUMNS.IS_DELETED.KEY]: is_deleted,
                    }), [`${DB_TABLE.USERS.COLUMNS.ID.KEY}`]));

                return user?.[0];
            }

            
            const user = await this.handleQuery(queryBuilder
                .table(DB_TABLE.USERS.TABLE_NAME)
                .insert(this.getDefinedUpdates({
                    [DB_TABLE.USERS.COLUMNS.NAME.KEY]: name,
                    [DB_TABLE.USERS.COLUMNS.UNIQUE_ID.KEY]: uniqueUserId,
                    [DB_TABLE.USERS.COLUMNS.EMAIL.KEY]: email,
                    [DB_TABLE.USERS.COLUMNS.MOBILE.KEY]: mobile,
                    [DB_TABLE.USERS.COLUMNS.PHOTO.KEY]: photo,
                    [DB_TABLE.USERS.COLUMNS.ROLE.KEY]: role,
                    [DB_TABLE.USERS.COLUMNS.PERMISSIONS_LIST.KEY]: permissions_list,
                    [DB_TABLE.USERS.COLUMNS.ACCOUNT_ID.KEY]: account_id,
                    [DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY]: polling_station_id,
                    [DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.KEY]: account_approved_status,
                    [DB_TABLE.USERS.COLUMNS.IS_DELETED.KEY]: is_deleted,
                }), [
                        `${DB_TABLE.USERS.COLUMNS.ID.KEY}`, 
                    ]));

            return user?.[0];

        } catch (e) {
            throw new DatabaseError(e);
        }

    }

    async getUsersCount({
        filters = {}, 
        uniqueUserId,
        email,
    }, trxProvider = null) {
        try {
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            const usersCount = await this.handleQuery(queryBuilder
                .table(DB_TABLE.USERS.TABLE_NAME)
                .select(DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY)
                .count({ count: '*' })
                .where(function() {
                    if (filters?.[FILTERS_LIST.polling_station_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY, filters[FILTERS_LIST.polling_station_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.volunteer_roles]?.length > 0) {
                      this.whereIn(DB_TABLE.USERS.COLUMNS.ROLE.KEY, filters[FILTERS_LIST.volunteer_roles]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.account_approved_statuses]?.length > 0) {
                      this.whereIn(DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.KEY, filters[FILTERS_LIST.account_approved_statuses]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.account_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.USERS.COLUMNS.ACCOUNT_ID.KEY, filters[FILTERS_LIST.account_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.volunteer_name]?.trim()?.length > 0) {
                      this.whereILike(DB_TABLE.USERS.COLUMNS.NAME.KEY, `%${filters[FILTERS_LIST.volunteer_name].trim()}%`);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(this.whereStatement({ 
                    ...(uniqueUserId ? {[DB_TABLE.USERS.COLUMNS.UNIQUE_ID.KEY]: uniqueUserId} : {}),
                    ...(email ? {[DB_TABLE.USERS.COLUMNS.EMAIL.KEY]: email} : {}),
                    [DB_TABLE.USERS.COLUMNS.IS_DELETED.KEY]: false,
                }))
                .groupBy(DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY)
            );
            return usersCount;
        } catch (e) {
            throw new DatabaseError(e);
        }
    }

    async getVolunteersList({ 
        account_id, 
        accountApproveStatus
    }, trxProvider = null) {
        try {
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            const users = await this.handleQuery(queryBuilder
                .table(DB_TABLE.USERS.TABLE_NAME)
                .select(
                    DB_TABLE.USERS.COLUMNS.ID.KEY,
                    DB_TABLE.USERS.COLUMNS.NAME.KEY,
                    DB_TABLE.USERS.COLUMNS.EMAIL.KEY,
                    DB_TABLE.USERS.COLUMNS.MOBILE.KEY,
                    DB_TABLE.USERS.COLUMNS.UNIQUE_ID.KEY,
                )
                .where(this.whereStatement({ 
                    ...(account_id ? {[DB_TABLE.USERS.COLUMNS.ACCOUNT_ID.KEY]: account_id} : {}),
                    ...(accountApproveStatus ? {[DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.KEY]: accountApproveStatus} : {}),
                    [DB_TABLE.USERS.COLUMNS.IS_DELETED.KEY]: false,
                }))
            );
            return users;
        } catch (e) {
            throw new DatabaseError(e);
        }
    }

    async getUsersByFilter({ 
        filters = {}, 
        uniqueUserId,
        email,
        page_no = 1, 
        limit = 50 
    }, trxProvider = null) {
        try {
            const queryBuilder = await this.getQueryBuilder(trxProvider);

            const users = await this.handleQuery(queryBuilder
                .table(DB_TABLE.USERS.TABLE_NAME)
                .where(function() {
                    if (filters?.[FILTERS_LIST.polling_station_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY, filters[FILTERS_LIST.polling_station_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.volunteer_name]?.trim()?.length > 0) {
                      this.whereILike(DB_TABLE.USERS.COLUMNS.NAME.KEY, `%${filters[FILTERS_LIST.volunteer_name].trim()}%`);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.volunteer_roles]?.length > 0) {
                      this.whereIn(DB_TABLE.USERS.COLUMNS.ROLE.KEY, filters[FILTERS_LIST.volunteer_roles]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.account_approved_statuses]?.length > 0) {
                      this.whereIn(DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.KEY, filters[FILTERS_LIST.account_approved_statuses]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(function() {
                    if (filters?.[FILTERS_LIST.account_ids]?.length > 0) {
                      this.whereIn(DB_TABLE.USERS.COLUMNS.ACCOUNT_ID.KEY, filters[FILTERS_LIST.account_ids]);
                    } else {
                      this.where(queryBuilder.raw('1 = 1'));
                    }
                })
                .where(this.whereStatement({ 
                    ...(uniqueUserId ? {[DB_TABLE.USERS.COLUMNS.UNIQUE_ID.KEY]: uniqueUserId} : {}),
                    ...(email ? {[DB_TABLE.USERS.COLUMNS.EMAIL.KEY]: email} : {}),
                    [DB_TABLE.USERS.COLUMNS.IS_DELETED.KEY]: false,
                }))
                .offset((page_no - 1) * limit)
                .limit(limit)
            );
            return users;
        } catch (e) {
            throw new DatabaseError(e);
        }
    }
    
    async getUsersIdsByFilter({ 
      filters = {}, 
      uniqueUserId,
      email,
      page_no = 1, 
      limit = 50 
  }, trxProvider = null) {
      try {
          const queryBuilder = await this.getQueryBuilder(trxProvider);

          const users = await this.handleQuery(queryBuilder
              .select(DB_TABLE.USERS.COLUMNS.ID.KEY)
              .table(DB_TABLE.USERS.TABLE_NAME)
              .where(function() {
                  if (filters?.[FILTERS_LIST.polling_station_ids]?.length > 0) {
                    this.whereIn(DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY, filters[FILTERS_LIST.polling_station_ids]);
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
              })
              .where(function() {
                  if (filters?.[FILTERS_LIST.volunteer_name]?.trim()?.length > 0) {
                    this.whereILike(DB_TABLE.USERS.COLUMNS.NAME.KEY, `%${filters[FILTERS_LIST.volunteer_name].trim()}%`);
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
              })
              .where(function() {
                  if (filters?.[FILTERS_LIST.volunteer_roles]?.length > 0) {
                    this.whereIn(DB_TABLE.USERS.COLUMNS.ROLE.KEY, filters[FILTERS_LIST.volunteer_roles]);
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
              })
              .where(function() {
                  if (filters?.[FILTERS_LIST.account_approved_statuses]?.length > 0) {
                    this.whereIn(DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.KEY, filters[FILTERS_LIST.account_approved_statuses]);
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
              })
              .where(function() {
                  if (filters?.[FILTERS_LIST.account_ids]?.length > 0) {
                    this.whereIn(DB_TABLE.USERS.COLUMNS.ACCOUNT_ID.KEY, filters[FILTERS_LIST.account_ids]);
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
              })
              .where(this.whereStatement({ 
                  ...(uniqueUserId ? {[DB_TABLE.USERS.COLUMNS.UNIQUE_ID.KEY]: uniqueUserId} : {}),
                  ...(email ? {[DB_TABLE.USERS.COLUMNS.EMAIL.KEY]: email} : {}),
                  [DB_TABLE.USERS.COLUMNS.IS_DELETED.KEY]: false,
              }))
              .offset((page_no - 1) * limit)
              .limit(limit)
          );
          return users;
      } catch (e) {
          throw new DatabaseError(e);
      }
    }
    
    async getPollingStationsByUserFilter({ 
      filters = {}, 
    }, trxProvider = null) {
      try {
          const queryBuilder = await this.getQueryBuilder(trxProvider);

          const users = await this.handleQuery(queryBuilder
              .table(DB_TABLE.USERS.TABLE_NAME)
              .select(DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY, DB_TABLE.USERS.COLUMNS.ID.KEY)
              .where(function() {
                  if (filters?.[FILTERS_LIST.polling_station_ids]?.length > 0) {
                    this.whereIn(DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY, filters[FILTERS_LIST.polling_station_ids]);
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
              })
              .where(function() {
                  if (filters?.[FILTERS_LIST.volunteer_name]?.trim()?.length > 0) {
                    this.whereILike(DB_TABLE.USERS.COLUMNS.NAME.KEY, `%${filters[FILTERS_LIST.volunteer_name].trim()}%`);
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
              })
              .where(function() {
                  if (filters?.[FILTERS_LIST.volunteer_roles]?.length > 0) {
                    this.whereIn(DB_TABLE.USERS.COLUMNS.ROLE.KEY, filters[FILTERS_LIST.volunteer_roles]);
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
              })
              .where(function() {
                  if (filters?.[FILTERS_LIST.account_approved_statuses]?.length > 0) {
                    this.whereIn(DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.KEY, filters[FILTERS_LIST.account_approved_statuses]);
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
              })
              .where(function() {
                  if (filters?.[FILTERS_LIST.account_ids]?.length > 0) {
                    this.whereIn(DB_TABLE.USERS.COLUMNS.ACCOUNT_ID.KEY, filters[FILTERS_LIST.account_ids]);
                  } else {
                    this.where(queryBuilder.raw('1 = 1'));
                  }
              })
              .where(this.whereStatement({ 
                  [DB_TABLE.USERS.COLUMNS.IS_DELETED.KEY]: false,
              }))
              .distinct()
          );
          return users;
      } catch (e) {
          throw new DatabaseError(e);
      }
    }
}

module.exports = UsersModel;
