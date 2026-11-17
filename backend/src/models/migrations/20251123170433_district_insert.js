const { PUBLIC_SCHEMA, DB_TABLE } = require("../libs/dbConstants");
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  const data = require("../../../districtdata/district.json");

  const rows = data.map(d => ({
    name: d.name,
    state_code: d.state_code,
    district_code: d.district_code
  }));

  return knex.withSchema(PUBLIC_SCHEMA)
        .table(DB_TABLE.DISTRICT.TABLE_NAME)
        .insert(rows);

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  
};
