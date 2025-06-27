import { Op } from 'sequelize';
import Permission from '../database/models/Permission';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';

// Channel based roles can only assign permissions in channel-based scope
export async function isPermissionAssignable(
    permissionIds: number | number[],
    isAuthorizedUserGlobalRole: boolean = false
): Promise<boolean> {
    // Global roles can assign any permissions
    if (isAuthorizedUserGlobalRole) {
        return true;
    }

    // Channel-based roles can only assign roles within their channel
    if (Array.isArray(permissionIds)) {
        for (const id of permissionIds) {
            const permission = await Permission.findByPk(id);

            if (permission?.scope === 'global') {
                return false;
            }
        }
    } else {
        const permission = await Permission.findByPk(permissionIds);

        if (permission?.scope == 'global') {
            return false;
        }
    }

    return true;
}

export async function findMissingPermissions(permissionIds: number | number[]): Promise<number[]> {
    permissionIds = Array.isArray(permissionIds) ? permissionIds : [permissionIds];
    const existingPermissions = await Permission.findAll({ where: { id: permissionIds } });
    const existingIds = existingPermissions.map((permission) => permission.id);

    return permissionIds.filter((id) => !existingIds.includes(id));
}

/**
 * @param userId
 * The ID of the user to check permission for.
 *
 * @param permissionRefNames
 * A single permission name or an array of permission names to check.
 *
 * @param permissionScope
 * If provided, restricts the check to either 'channel' or 'global' permissions only.
 *
 * @param channelId
 * If provided, checks for channel-based roles for the specified channelId
 * If not provided, checks only global roles.
 * Must be provided if permissionScope is 'channel'.
 *
 * @returns boolean
 * True if the user has at least one of the requested permissions in the applicable scope(s), false otherwise.
 */
export async function userHasPermissions(
    user: User,
    permissionRefNames: string | string[],
    permissionScope: 'channel' | 'global' = 'global',
    channelId?: number
): Promise<boolean> {
    if (!user) throw new AppError('User not found', 404);

    if (permissionScope === 'channel' && !channelId) {
        throw new Error("channelId must be provided when permissionScope is 'channel'");
    }

    // Check global roles
    const globalRoles = await user.getRoles({
        where: { channel_id: { [Op.is]: null }, scope: 'global' }
    });

    if (
        globalRoles &&
        (await rolesHasPermissions(globalRoles, permissionRefNames, permissionScope))
    ) {
        return true;
    }

    if (!channelId) {
        return false;
    }

    // Check channel roles
    const channelRoles = await user.getRoles({
        where: { channel_id: channelId }
    });

    return await rolesHasPermissions(channelRoles, permissionRefNames, permissionScope);
}

async function rolesHasPermissions(
    roles: any[],
    permissionRefNames: string | string[],
    permissionScope: string
): Promise<boolean> {
    if (!roles?.length) return false;

    const whereCondition = Array.isArray(permissionRefNames)
        ? { ref_name: { [Op.in]: permissionRefNames }, scope: permissionScope }
        : { ref_name: permissionRefNames, scope: permissionScope };

    for (const role of roles) {
        const [permission] = await role.getPermissions({
            where: whereCondition,
            limit: 1
        });
        if (permission) return true;
    }

    return false;
}

export async function checkPermissionLevel(
    permissionRefNames: string | string[],
    user: User,
    isGlobalRole: boolean = false,
    channelId?: number
): Promise<number | null> {
    let highestLevel: number | null = null;

    if (!isGlobalRole && !channelId) {
        throw new AppError('Channel ID parameter is required if isGlobalRole is false.');
    }

    let roles = await user.getRoles();

    console.log('roles.length', roles.length);

    if (channelId) {
        roles = await user.getRoles({ where: { channel_id: { [Op.in]: [channelId, null] } } });
    }

    for (const role of roles) {
        const permissions = await role.getPermissions({
            where: {
                ref_name: {
                    [Op.in]: Array.isArray(permissionRefNames)
                        ? permissionRefNames
                        : [permissionRefNames]
                },
                scope: 'global'
            }
        });

        if (permissions.length > 0) {
            const currentLevel = role.level;

            if (highestLevel === null || currentLevel < highestLevel) {
                highestLevel = currentLevel;
            }
        }
    }

    return highestLevel;
}

export async function getUserPermissions(
    targetUserId: number, // the user whose permissions you're checking
    authorizedUserRoleLevel: number, // the role level of the user requesting access
    channelId?: number
) {
    const user = await User.findByPk(targetUserId);

    if (!user) throw new AppError('User not found.', 404);

    const roles = await user.getRoles({
        where: {
            channel_id: {
                [Op.in]: channelId ? [null, channelId] : [null]
            },
            level: {
                [Op.gte]: authorizedUserRoleLevel
            }
        }
    });

    const permissionsNested = await Promise.all(roles.map((role) => role.getPermissions()));

    const permissions = permissionsNested.flat();

    // Remove duplicate permissions
    const uniquePermissions = Array.from(new Map(permissions.map((p) => [p.id, p])).values());

    console.log(uniquePermissions);

    return uniquePermissions;
}

/**
 *
 * @param userId
 * @param permissionId
 * @param channel_id - Assume to look only for global roles if it's empty
 *
 * Checks if the user has access to a specific permission.
 * It verifies whether the permission is assigned to the user.
 * If `channel_id` is provided, both global and channel-specific roles are considered.
 * If `channel_id` is not provided, only global roles are checked.
 * */
export async function hasAccessToPermission(
    userId: number,
    permissionId: number,
    channel_id?: number
) {
    const user = await User.findByPk(userId);
    if (!user) throw new AppError('User not found.', 404);

    const roles = await user?.getRoles({
        where: { channel_id: { [Op.in]: channel_id ? [null, channel_id] : [null] } }
    });
    if (!roles) return false;

    for (const role of roles) {
        const [permission] = await role.getPermissions({ where: { id: permissionId } });

        if (permission) {
            return true;
        }
    }

    return false;
}
