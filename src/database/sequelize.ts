import { Sequelize } from 'sequelize-typescript';
import Role from './models/Role';

const sequelize = new Sequelize({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    dialect: 'postgres',
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    storage: ':memory:',
    models: [Role]
});

export default sequelize;
