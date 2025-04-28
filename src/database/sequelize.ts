import { Sequelize } from 'sequelize-typescript';
import Role from './models/Role';
import Channel from './models/Channel';

const sequelize = new Sequelize({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    dialect: 'postgres',
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    storage: ':memory:',
    models: [Role, Channel]
});

export default sequelize;
