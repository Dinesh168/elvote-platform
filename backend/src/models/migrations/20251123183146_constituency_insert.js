const { PUBLIC_SCHEMA, DB_TABLE } = require("../libs/dbConstants");
/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  const data = require("../../../districtdata/assembly.json");

  const rows = data.map(d => ({
    name: d.name,
    constituency_number: d.constituency_number,
    district_code: d.district_code
  }));

  return knex.withSchema(PUBLIC_SCHEMA)
        .table(DB_TABLE.CONSTITUENCY.TABLE_NAME)
        .insert(rows)
        .onConflict("constituency_number")
        .merge();

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  
};
