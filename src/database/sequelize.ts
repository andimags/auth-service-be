import { Sequelize } from 'sequelize-typescript';
import Channel from './models/Channel';
import Permission from './models/Permission';
import Role from './models/Role';
import User from './models/User';

const sequelize = new Sequelize({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    dialect: 'postgres',
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    storage: ':memory:',
    models: [Role, Channel, Permission, User]
});

export default sequelize;
