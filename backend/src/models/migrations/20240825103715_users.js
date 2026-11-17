const { PUBLIC_SCHEMA, DB_TABLE } = require("../libs/dbConstants");

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.withSchema(PUBLIC_SCHEMA)
        .alterTable(DB_TABLE.USERS.TABLE_NAME, function (table) {
          table.string(DB_TABLE.USERS.COLUMNS.MOBILE.KEY, 15).unique();
        })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.withSchema(PUBLIC_SCHEMA)
            .alterTable(DB_TABLE.USERS.TABLE_NAME, function (table) {
              table.renameColumn(DB_TABLE.USERS.COLUMNS.MOBILE.KEY, `${Math.floor(Date.now() / 1000)}_old_${DB_TABLE.USERS.COLUMNS.MOBILE.KEY}`);
            })
};
