import 'dotenv/config';
import { Sequelize } from 'sequelize-typescript';
import Channel from './models/Channel';
import Permission from './models/Permission';
import Policy from './models/Policy';
import PolicyPermission from './models/PolicyPermission';
import RefreshToken from './models/RefreshToken';
import Role from './models/Role';
import RolePermission from './models/RolePermission';
import RolePolicy from './models/RolePolicy';
import User from './models/User';
import UserRole from './models/UserRole';

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
        RefreshToken,
        PolicyPermission,
        RolePolicy,
        Policy
    ],
    logging: false,
});

export default sequelize;
