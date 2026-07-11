// Must stay CommonJS: sequelize-cli loads this file via Node's native
// import()/require() (see import-helper.js), with no ts-node registered
// in the migrate/seed scripts, so it cannot parse TypeScript.
require('dotenv').config();

module.exports = {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'postgres',
};
