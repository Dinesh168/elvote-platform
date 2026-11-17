const { DB_TABLE, PUBLIC_SCHEMA } = require("../libs/dbConstants");

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.withSchema(PUBLIC_SCHEMA)
        .createTable(DB_TABLE.ACCOUNTS.TABLE_NAME, function (table) {
            table.increments();
            table.string(DB_TABLE.ACCOUNTS.COLUMNS.NAME.KEY).notNullable();
            table.jsonb(DB_TABLE.ACCOUNTS.COLUMNS.OTHER_DATA.KEY);
            table.string(DB_TABLE.ACCOUNTS.COLUMNS.PASS_KEY.KEY).notNullable().unique();
            table.boolean(DB_TABLE.ACCOUNTS.COLUMNS.IS_DELETED.KEY).defaultTo(false);
            table.timestamps(true, true, false);
        })
        .createTable(DB_TABLE.CONSTITUENCY.TABLE_NAME, function (table) {
            table.increments();
            table.string(DB_TABLE.CONSTITUENCY.COLUMNS.NAME.KEY).notNullable();
            table.integer(DB_TABLE.CONSTITUENCY.COLUMNS.CONSTITUENCY_NUMBER.KEY).notNullable().unique();
            table.jsonb(DB_TABLE.CONSTITUENCY.COLUMNS.OTHER_DATA.KEY);
            table.boolean(DB_TABLE.CONSTITUENCY.COLUMNS.IS_DELETED.KEY).defaultTo(false);
            table.timestamps(true, true, false);
        })
        .createTable(DB_TABLE.POLLING_STATION.TABLE_NAME, function (table) {
            table.increments();
            table.string(DB_TABLE.POLLING_STATION.COLUMNS.NAME.KEY).notNullable();
            table.integer(DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY).notNullable();
            table.string(DB_TABLE.POLLING_STATION.COLUMNS.ADDRESS.KEY);
            table.integer(DB_TABLE.POLLING_STATION.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY).notNullable().references(`${DB_TABLE.CONSTITUENCY.TABLE_NAME}.${DB_TABLE.CONSTITUENCY.COLUMNS.CONSTITUENCY_NUMBER.KEY}`);
            table.boolean(DB_TABLE.POLLING_STATION.COLUMNS.IS_DELETED.KEY).defaultTo(false);
            table.timestamps(true, true, false);
            table.unique([DB_TABLE.POLLING_STATION.COLUMNS.PART_NO.KEY, DB_TABLE.POLLING_STATION.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY, DB_TABLE.POLLING_STATION.COLUMNS.IS_DELETED.KEY], {
              indexName: `indx_unique_PS_partno_constituencyId_isDeleted`,
              predicate: knex.whereRaw(`${DB_TABLE.POLLING_STATION.COLUMNS.IS_DELETED.KEY}=false`)
            })
        })
        .createTable(DB_TABLE.USERS.TABLE_NAME, function (table) {
            table.increments();
            table.string(DB_TABLE.USERS.COLUMNS.UNIQUE_ID.KEY).notNullable().unique();
            table.string(DB_TABLE.USERS.COLUMNS.NAME.KEY).notNullable();
            table.string(DB_TABLE.USERS.COLUMNS.EMAIL.KEY).notNullable().unique();
            table.string(DB_TABLE.USERS.COLUMNS.ROLE.KEY).notNullable().defaultTo(DB_TABLE.USERS.COLUMNS.ROLE.VALUES.DEFAULT);
            table.string(DB_TABLE.USERS.COLUMNS.PHOTO.KEY);
            table.jsonb(DB_TABLE.USERS.COLUMNS.OTHER_DATA.KEY);
            table.jsonb(DB_TABLE.USERS.COLUMNS.PERMISSIONS_LIST.KEY);
            table.string(DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.KEY).notNullable().defaultTo(DB_TABLE.USERS.COLUMNS.ACCOUNT_APPROVED_STATUS.VALUES.DEFAULT);
            table.integer(DB_TABLE.USERS.COLUMNS.POLLING_STATION_ID.KEY).references(`${DB_TABLE.POLLING_STATION.TABLE_NAME}.${DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY}`);
            table.integer(DB_TABLE.USERS.COLUMNS.ACCOUNT_ID.KEY).notNullable().references(`${DB_TABLE.ACCOUNTS.TABLE_NAME}.${DB_TABLE.ACCOUNTS.COLUMNS.ID.KEY}`);
            table.boolean(DB_TABLE.USERS.COLUMNS.IS_DELETED.KEY).defaultTo(false);
            table.timestamps(true, true, false);
        })
        .createTable(DB_TABLE.CONSTITUENCY_ACCOUNT_MAPPING.TABLE_NAME, function (table) {
            table.increments();
            table.integer(DB_TABLE.CONSTITUENCY_ACCOUNT_MAPPING.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY).notNullable().references(`${DB_TABLE.CONSTITUENCY.TABLE_NAME}.${DB_TABLE.CONSTITUENCY.COLUMNS.CONSTITUENCY_NUMBER.KEY}`);
            table.integer(DB_TABLE.CONSTITUENCY_ACCOUNT_MAPPING.COLUMNS.ACCOUNT_ID.KEY).notNullable().references(`${DB_TABLE.ACCOUNTS.TABLE_NAME}.${DB_TABLE.ACCOUNTS.COLUMNS.ID.KEY}`);
            table.boolean(DB_TABLE.CONSTITUENCY_ACCOUNT_MAPPING.COLUMNS.IS_DELETED.KEY).defaultTo(false);
            table.timestamps(true, true, false);
            table.unique([DB_TABLE.CONSTITUENCY_ACCOUNT_MAPPING.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY, DB_TABLE.CONSTITUENCY_ACCOUNT_MAPPING.COLUMNS.ACCOUNT_ID.KEY, DB_TABLE.CONSTITUENCY_ACCOUNT_MAPPING.COLUMNS.IS_DELETED.KEY], {
              indexName: `indx_unique_CAM_constituencyId_accountId_isDeleted`,
              predicate: knex.whereRaw(`${DB_TABLE.CONSTITUENCY_ACCOUNT_MAPPING.COLUMNS.IS_DELETED.KEY}=false`)
            })
        })
        .createTable(DB_TABLE.PERMISSIONS.TABLE_NAME, function (table) {
            table.increments();
            table.string(DB_TABLE.PERMISSIONS.COLUMNS.NAME.KEY).notNullable();
            table.string(DB_TABLE.PERMISSIONS.COLUMNS.TYPE.KEY).defaultTo(DB_TABLE.PERMISSIONS.COLUMNS.TYPE.VALUES.DEFAULT);
            table.boolean(DB_TABLE.PERMISSIONS.COLUMNS.IS_DELETED.KEY).defaultTo(false);
            table.timestamps(true, true, false);
        })
        .createTable(DB_TABLE.PERMISSIONS_TEMPLATE.TABLE_NAME, function (table) {
            table.increments();
            table.string(DB_TABLE.PERMISSIONS_TEMPLATE.COLUMNS.NAME.KEY).notNullable();
            table.jsonb(DB_TABLE.PERMISSIONS_TEMPLATE.COLUMNS.PERMISSIONS_LIST.KEY).notNullable();
            table.boolean(DB_TABLE.PERMISSIONS_TEMPLATE.COLUMNS.IS_DELETED.KEY).defaultTo(false);
            table.timestamps(true, true, false);
            table.unique([DB_TABLE.PERMISSIONS_TEMPLATE.COLUMNS.NAME.KEY, DB_TABLE.PERMISSIONS_TEMPLATE.COLUMNS.IS_DELETED.KEY], {
              indexName: `indx_unique_PT_userId_isDeleted`,
              predicate: knex.whereRaw(`${DB_TABLE.PERMISSIONS_TEMPLATE.COLUMNS.IS_DELETED.KEY}=false`)
            })
        })
        
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.withSchema(PUBLIC_SCHEMA)
            .renameTable(DB_TABLE.USERS.TABLE_NAME, `${Math.floor(Date.now() / 1000)}_old_${DB_TABLE.USERS.TABLE_NAME}`)
            .renameTable(DB_TABLE.ACCOUNTS.TABLE_NAME, `${Math.floor(Date.now() / 1000)}_old_${DB_TABLE.ACCOUNTS.TABLE_NAME}`)
            .renameTable(DB_TABLE.CONSTITUENCY.TABLE_NAME, `${Math.floor(Date.now() / 1000)}_old_${DB_TABLE.CONSTITUENCY.TABLE_NAME}`)
            .renameTable(DB_TABLE.CONSTITUENCY_ACCOUNT_MAPPING.TABLE_NAME, `${Math.floor(Date.now() / 1000)}_old_${DB_TABLE.CONSTITUENCY_ACCOUNT_MAPPING.TABLE_NAME}`)
            .renameTable(DB_TABLE.PERMISSIONS.TABLE_NAME, `${Math.floor(Date.now() / 1000)}_old_${DB_TABLE.PERMISSIONS.TABLE_NAME}`)
            .renameTable(DB_TABLE.PERMISSIONS_TEMPLATE.TABLE_NAME, `${Math.floor(Date.now() / 1000)}_old_${DB_TABLE.PERMISSIONS_TEMPLATE.TABLE_NAME}`)
            .renameTable(DB_TABLE.POLLING_STATION.TABLE_NAME, `${Math.floor(Date.now() / 1000)}_old_${DB_TABLE.POLLING_STATION.TABLE_NAME}`)
};
