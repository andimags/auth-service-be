import { faker } from '@faker-js/faker';
import request from 'supertest';
import app from '../src/app';
import { PermissionAccessLevelType, UserLevelType } from '../src/constants/enums';
import Permission from '../src/database/models/Permission';
import Policy from '../src/database/models/Policy';
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
    return {
        name: `Channel Test ${Date.now()}`,
        description: `Channel Test Description ${Date.now()}`,
        ref_name: `channel_test_${Date.now()}`
    };
}

export function generatePermissionData() {
    const accesLevelValues = Object.values(PermissionAccessLevelType); // ['read', 'write', admin]

    const randomAccessLevel =
        accesLevelValues[Math.floor(Math.random() * accesLevelValues.length)];

    return {
        name: `Permission Test ${Date.now()}`,
        ref_name: `permission_test_${Date.now()}`,
        module: 'Test Module',
        scope: 'channel', // Global scopes can only be seeded
        access_level: randomAccessLevel
    };
}

export function generateRoleData(channelId?: number, level?: number) {
    return {
        name: `Role Test ${Date.now()}`,
        ref_name: `role_test_${Date.now()}`,
        level: level ?? 5,
        scope: channelId ? 'channel' : 'global',
        ...(channelId ? { channel_id: channelId } : {})
    };
}

export async function generateToken(
    email: string,
    password: string,
    apiKey = 'global'
) {
    const AGENT = request.agent(app); // preserves cookies

    const res = await AGENT.post('/api/auth/generate-token')
        .set({
            'x-api-key': apiKey
        })
        .send({
            email: email,
            password: password
        });

    return {
        // Bug fix: the login response shape is { user, permissions, tokens: {
        // access: { value, expires_at }, refresh: {...} } } — this previously
        // read the flat, no-longer-existing res.body.access_token, so every
        // caller of this helper (nearly every test in the suite) got
        // accessToken: undefined and silently authenticated as nobody.
        accessToken: res.body.tokens?.access?.value,
        agent: AGENT
    };
}

// Helper function to create authenticated headers. apiKey defaults to 'global'
// since that's what createAuthUser's own default logs in with — pass the specific
// channel api_key (IAuth.apiKey) for a user created via createAuthUser(apiKey).
// Bug fix: this previously never set x-api-key at all, so checkApiKeyMiddleware
// rejected every request using this helper with 403 "Invalid API key" regardless
// of the caller's actual permissions.
export const createAuthHeaders = (accessToken: string, apiKey = 'global') => ({
    Authorization: `Bearer ${accessToken}`,
    'x-api-key': apiKey,
    'Content-Type': 'application/json'
});

// `level` defaults to the model's own default (member). Pass UserLevelType.superadmin
// to create a user that bypasses RBAC checks entirely under a global-scope API key —
// "superadmin" is a User.level value in this codebase, not an assignable Role, so
// there is no Role to look up/assign for this (see git history for the older,
// incorrect assumption this replaced).
export const createAuthUser = async (
    apiKey = 'global',
    level?: UserLevelType
) => {
    const user = await User.create({
        ...(await generateUserData()),
        ...(level && { level })
    });
    const response = await generateToken(user.email, DEFAULT_PASSWORD, apiKey);

    return {
        user: user,
        accessToken: response.accessToken,
        agent: response.agent,
        apiKey
    };
};

// Helper function to clean up user roles, and the policies/permissions those roles own
export const cleanupUserRoles = async (user: User) => {
    const roles = await user.getRoles();

    await user.removeRoles(roles);
    await forceDeleteInstances(roles);
};

// Helper function to create a channel-scoped role, granting it existing permissions
// via a freshly-created policy (roles reach permissions through policies, not directly)
export const createRole = async (
    permissionRefNames: string[],
    channelId?: number,
    roleLevel: number = 5
) => {
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

    const policy = await Policy.create({
        name: 'Test Policy',
        ref_name: `test_policy_${Date.now()}`
    });

    await policy.addPermissions(permissions);
    await role.addPolicies([policy]);

    return role;
};

/**
 *
 * @param instances
 *
 * You are passing an array of Sequelize model instances (each has a
 * .destroy({ force }) method). Seeded/system records (is_system: true) are
 * skipped, since the models themselves reject hard-deleting those. Roles and
 * policies are cascaded: destroying a role also destroys its own non-system
 * policies, and destroying a policy also destroys its own non-system permissions.
 */
export async function forceDeleteInstances(
    instances: Array<{
        destroy: (options: { force: boolean }) => Promise<void>;
        is_system?: boolean;
    }>
) {
    for (const instance of instances) {
        if (instance.is_system) {
            continue;
        }

        if (instance instanceof Role) {
            await forceDeleteInstances(await instance.getPolicies());
        }

        if (instance instanceof Policy) {
            await forceDeleteInstances(await instance.getPermissions());
        }

        if (instance?.destroy) {
            await instance.destroy({ force: true });
        }
    }
}
