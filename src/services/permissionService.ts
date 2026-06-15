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

    const whereOptions: WhereOptions = {};

    if (roleScope === 'global' || roleScope === 'channel') {
        whereOptions.scope = roleScope;
    }

    if (roleScope === 'channel') {
        whereOptions.channel_id = channelId!;
    }

    const roles = await user.getRoles({
        where: whereOptions,
        include: [
            {
                model: Policy,
                through: { attributes: [] },
                include: [
                    {
                        model: Permission,
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

export const findMissingPermissionIds = async (
    permissionIds: number | number[] | string | string[]
): Promise<(string | number)[]> => {
    const ids = Array.isArray(permissionIds) ? permissionIds : [permissionIds];

    const existingPermissions = await Permission.findAll({
        where: {
            id: ids
        }
    });

    const existingPermissionIds = new Set(existingPermissions.map(p => p.id));

    return ids.filter(id => !existingPermissionIds.has(Number(id)));
};