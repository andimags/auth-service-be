import 'dotenv/config';
import { Sequelize } from 'sequelize-typescript';
import Channel from './models/Channel';
import Permission from './models/Permission';
import Role from './models/Role';
import RolePermission from './models/RolePermission';
import User from './models/User';
import UserRole from './models/UserRole';
import RefreshToken from './models/RefreshToken';

const sequelize = new Sequelize({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    dialect: 'postgres',
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    models: [
        Role,
        Channel,
        Permission,
        User,
        UserRole,
        RolePermission,
        RefreshToken
    ],
    logging: false
});

export default sequelize;
