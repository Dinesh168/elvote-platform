const { PUBLIC_SCHEMA, DB_TABLE } = require("../libs/dbConstants");
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.withSchema(PUBLIC_SCHEMA)
        .createTable(DB_TABLE.DISTRICT.TABLE_NAME, function (table) {
            table.increments();
            table.string(DB_TABLE.DISTRICT.COLUMNS.NAME.KEY).notNullable();
            table.string(DB_TABLE.DISTRICT.COLUMNS.STATE_CODE.KEY, 3).notNullable();
            table.string(DB_TABLE.DISTRICT.COLUMNS.DISTRICT_CODE.KEY, 5).notNullable().unique();
            table.jsonb(DB_TABLE.DISTRICT.COLUMNS.OTHER_DATA.KEY);
            table.boolean(DB_TABLE.DISTRICT.COLUMNS.IS_DELETED.KEY).defaultTo(false);
            table.timestamps(true, true, false);
        })
        .createTable(DB_TABLE.ZONES.TABLE_NAME, function (table) {
            table.increments();
            table.string(DB_TABLE.ZONES.COLUMNS.NAME.KEY).notNullable();
            table.jsonb(DB_TABLE.ZONES.COLUMNS.OTHER_DATA.KEY);
            table.boolean(DB_TABLE.ZONES.COLUMNS.IS_DELETED.KEY).defaultTo(false);
            table.integer(DB_TABLE.ZONES.COLUMNS.CONSTITUENCY_NUMBER_ID.KEY).references(DB_TABLE.CONSTITUENCY.COLUMNS.ID.KEY).inTable(`${PUBLIC_SCHEMA}.${DB_TABLE.CONSTITUENCY.TABLE_NAME}`);
            table.integer(DB_TABLE.ZONES.COLUMNS.ACCOUNT_ID.KEY).references(DB_TABLE.ACCOUNTS.COLUMNS.ID.KEY).inTable(`${PUBLIC_SCHEMA}.${DB_TABLE.ACCOUNTS.TABLE_NAME}`);
            table.timestamps(true, true, false);
        })
        .createTable(DB_TABLE.POLLING_STATION_ZONE_MAPPING.TABLE_NAME, function (table) {
            table.increments();
            table.integer(DB_TABLE.POLLING_STATION_ZONE_MAPPING.COLUMNS.POLLING_STATION_ID.KEY).references(DB_TABLE.POLLING_STATION.COLUMNS.ID.KEY).inTable(`${PUBLIC_SCHEMA}.${DB_TABLE.POLLING_STATION.TABLE_NAME}`);
            table.integer(DB_TABLE.POLLING_STATION_ZONE_MAPPING.COLUMNS.ZONE_ID.KEY).references(DB_TABLE.ZONES.COLUMNS.ID.KEY).inTable(`${PUBLIC_SCHEMA}.${DB_TABLE.ZONES.TABLE_NAME}`);
            table.boolean(DB_TABLE.POLLING_STATION_ZONE_MAPPING.COLUMNS.IS_DELETED.KEY).defaultTo(false);
            table.timestamps(true, true, false);
        })
        .alterTable(DB_TABLE.CONSTITUENCY.TABLE_NAME, function (table) {
          table.string(DB_TABLE.CONSTITUENCY.COLUMNS.DISTRICT_CODE.KEY, 5).references(DB_TABLE.DISTRICT.COLUMNS.DISTRICT_CODE.KEY).inTable(`${PUBLIC_SCHEMA}.${DB_TABLE.DISTRICT.TABLE_NAME}`);
        });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.withSchema(PUBLIC_SCHEMA)
            .renameTable(DB_TABLE.DISTRICT.TABLE_NAME, `${Math.floor(Date.now() / 1000)}_old_${DB_TABLE.DISTRICT.TABLE_NAME}`)
            .renameTable(DB_TABLE.ZONES.TABLE_NAME, `${Math.floor(Date.now() / 1000)}_old_${DB_TABLE.ZONES.TABLE_NAME}`)
            .renameTable(DB_TABLE.POLLING_STATION_ZONE_MAPPING.TABLE_NAME, `${Math.floor(Date.now() / 1000)}_old_${DB_TABLE.POLLING_STATION_ZONE_MAPPING.TABLE_NAME}`)
            .alterTable(DB_TABLE.CONSTITUENCY.TABLE_NAME, function (table) {
              table.renameColumn(DB_TABLE.CONSTITUENCY.COLUMNS.DISTRICT_CODE.KEY, `${Math.floor(Date.now() / 1000)}_old_${DB_TABLE.CONSTITUENCY.COLUMNS.DISTRICT_CODE.KEY}`);
            })
};
