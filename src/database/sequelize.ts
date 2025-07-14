import { Sequelize } from 'sequelize-typescript';
import Channel from './models/Channel';
import Permission from './models/Permission';
import Role from './models/Role';
import User from './models/User';
import UserRole from './models/UserRole';
import RolePermission from './models/RolePermission';
import RefreshToken from './models/RefreshToken';

console.log(process.env.NODE_ENV);

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
    logging: true
});

export default sequelize;
