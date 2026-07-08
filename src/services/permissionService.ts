import Permission, {IPermission} from '../database/models/Permission';
import Policy, {IPolicy} from '../database/models/Policy';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';
import { WhereOptions } from 'sequelize';

export const userHasPermissions = async (
    user: User,
    permissionRefNames: string | string[],
    roleScope: 'global' | 'channel' | '*',
    channelId?: number
): Promise<boolean> => {
    const permissions = await getUserPermissions(user, roleScope, channelId);

    const requiredPermissions = Array.isArray(permissionRefNames)
        ? permissionRefNames
        : [permissionRefNames];

    return requiredPermissions.every(refName =>
        permissions.some((permission: IPermission) => {
            return permission.ref_name === refName
        })
    );
};

export const userHasAnyPermission = async (
    user: User,
    permissionRefNames: string | string[],
    roleScope: 'global' | 'channel' | '*',
    channelId?: number
): Promise<boolean> => {
    const permissions = await getUserPermissions(user, roleScope, channelId);
    console.log('users permissions: ', permissions);

    const requiredPermissions = Array.isArray(permissionRefNames)
        ? permissionRefNames
        : [permissionRefNames];

    return requiredPermissions.some(refName =>
        permissions.some((permission: IPermission) => {
            return permission.ref_name === refName
        })
    );
};

export const getUserPermissions = async (
    user: User,
    roleScope: 'global' | 'channel' | '*',
    channelId?: number
): Promise<IPermission[]> => {
    if (roleScope === 'channel' && !channelId) {
        throw new AppError('channelId is required when roleScope is channel', 400);
    }

    const roleWhereOptions: WhereOptions = {};

    if (roleScope === 'global' || roleScope === 'channel') {
        roleWhereOptions.scope = roleScope;
    }

    if (roleScope === 'channel') {
        roleWhereOptions.channel_id = channelId!;
    }

    const permissionWhereOptions: WhereOptions = {};

    const roles = await user.getRoles({
        where: roleWhereOptions,
        include: [
            {
                model: Policy,
                through: { attributes: [] },
                include: [
                    {
                        model: Permission,
                        where: permissionWhereOptions,
                        through: { attributes: [] }
                    }
                ]
            }
        ]
    });

    const permissionsSet = new Set<IPermission>();

    roles.forEach(role => {
        role.policies.forEach((policy: IPolicy) => {
            policy.permissions.forEach((permission: IPermission) => {
                permissionsSet.add(permission);
            });
        });
    });

    return Array.from(permissionsSet);
}

export const findMissingPermissions = async (
    permissionRefNames: string | string[]
): Promise<string[]> => {
    const refNames = Array.isArray(permissionRefNames) ? permissionRefNames : [permissionRefNames];

    const existingPermissions = await Permission.findAll({
        where: {
            ref_name: refNames
        }
    });

    const existingPermissionRefNames = new Set(existingPermissions.map(p => p.ref_name));

    return refNames.filter(refName => !existingPermissionRefNames.has(refName));
};

export const getMissingUserPermissions = async (
    user: User,
    permissionRefNames: string | string[],
    roleScope: 'global' | 'channel' | '*',
    channelId?: number
): Promise<string[]> => {
    const requestedRefNames = Array.isArray(permissionRefNames)
        ? permissionRefNames
        : [permissionRefNames];

    const userPermissions = await getUserPermissions(
        user,
        roleScope,
        channelId
    );

    const userPermissionRefNames = new Set(
        userPermissions.map(p => p.ref_name)
    );

    return requestedRefNames.filter(
        refName => !userPermissionRefNames.has(refName)
    );
};

/* -------------------------------------------------------------------------- */
/*      returns an array of ref_names where permission is_system is true      */
/* -------------------------------------------------------------------------- */
export async function findSystemPermissions(
    permissionRefNames: string | string[]
): Promise<string[]> {
    const refNamesToCheck = Array.isArray(permissionRefNames)
        ? permissionRefNames
        : [permissionRefNames];

    const permissions = await Permission.findAll({
        where: {
            ref_name: refNamesToCheck,
            is_system: true,
        },
        attributes: ["ref_name"],
    });

    return permissions.map((permission) => permission.ref_name);
}
