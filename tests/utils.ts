import { faker } from '@faker-js/faker';
import request from 'supertest';
import app from '../src/app';
import { PermissionAccessLevelType } from '../src/constants/enums';
import Permission from '../src/database/models/Permission';
import Role from '../src/database/models/Role';
import User from '../src/database/models/User';
import { AppError } from '../src/middlewares/errorHandler';

const DEFAULT_PASSWORD = 'abcd1234';

export function generateUserData() {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();

    return {
        username: `${firstName}_${lastName}`,
        email: `${firstName}_${lastName}@gmail.com`,
        first_name: firstName,
        last_name: lastName,
        password: DEFAULT_PASSWORD,
        status: 'active'
    };
}

export function generateChannelData() {
    const name = faker.lorem.words(2);
    const description = faker.lorem.sentence();

    return {
        name: name,
        description: description,
        ref_name: name.replace(' ', '_')
    };
}

export function generatePermissionData(){
    const accesLevelValues = Object.values(PermissionAccessLevelType); // ['read', 'write', admin]

    const randomAccessLevel = accesLevelValues[Math.floor(Math.random() * accesLevelValues.length)];

    return {
        name: `Permission Test ${Date.now()}`,
        ref_name: `permission_test_${Date.now()}`,
        module: 'Test Module',
        scope: 'channel', // Global scopes can only be seeded
        access_level: randomAccessLevel
    }
}

export function generateRoleData(channelId?: number, level?: number){
    return {
        name: `Role Test ${Date.now()}`,
        ref_name: `role_test_${Date.now()}`,
        level: level ?? 5,
        channel_id: channelId ?? null,
        scope: channelId ? 'channel' : 'global'
    }
}

export async function generateToken(email: string, password: string) {
    const res = await request(app).post('/api/auth/generate-token').send({
        email: email,
        password: password
    });

    return res.body.token;
}

// Helper function to create authenticated headers
export const createAuthHeaders = (token: string, apiKey: string = 'global') => ({
    Authorization: `Bearer ${token}`,
    'x-api-key': apiKey,
    'Content-Type': 'application/json'
});

export const createAuthUser = async () => {
    const user = await User.create(await generateUserData());

    return {
        user: user,
        token: await generateToken(user.email, DEFAULT_PASSWORD),
    };
}

// Helper function to clean up user roles and permissions
export const cleanupUserRoles = async (user: User) => {
    const roles = await user.getRoles();

    for (const role of roles) {
        // Avoid deleting global permissions
        const permissions = await role.getPermissions({where: {scope: 'channel'}});
        console.log('xxx', permissions);

        for (const permission of permissions) {
            await role.removePermissions([permission]);
            await permission.destroy({ force: true });
        }

        await user.removeRoles([role]);
        await role.destroy({ force: true });
    }
};

// Helper function to create channel-scoped role with existing global permissions
export const createRole = async (permissionRefNames: string[], channelId?: number, roleLevel: number = 5) => {
    const role = await Role.create({
        name: 'Test Channel Role',
        ref_name: `test_channel_role_${Date.now()}`,
        level: roleLevel,
        channel_id: channelId ?? null,
        scope: channelId ? 'channel' : 'global'
    });

    const permissions = await Permission.findAll({
        where: { ref_name: permissionRefNames }
    });

    if (permissions.length !== permissionRefNames.length) {
        throw new AppError('Some permissions not found');
    }

    await role.addPermissions(permissions);
    return role;
};

/**
 * 
 * @param instances 
 * 
 * You are passing an array of objects.
 * Each object must have a .destroy() method.
 * The .destroy() method must accept an object like { force: true } and return a Promise.
 * In other words: it's describing Sequelize model instances.
 */
export async function forceDeleteInstances(instances: Array<{ destroy: (options: { force: boolean }) => Promise<void> }>) {
    for (const instance of instances) {
        if (instance?.destroy) {
            await instance.destroy({ force: true });
        }
    }
}
