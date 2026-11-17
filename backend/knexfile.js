
require('dotenv').config()

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {

  client: process.env.DATABASE_CLIENT,
  connection: {
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: false
  },
  pool: {
    min: parseInt(process.env.DATABASE_POOL_MIN),
    max: parseInt(process.env.DATABASE_POOL_MAX)
  }

};
