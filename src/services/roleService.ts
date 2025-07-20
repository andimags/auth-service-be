import { Op } from 'sequelize';
import Role from '../database/models/Role';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';

export async function userCanManageRoles(
    roleIds: number | number[],
    userRoleLevel: number,
    userChannelId: number | null,
    userHasGlobalRole: boolean = false
): Promise<boolean> {
    if (!userHasGlobalRole && !userChannelId)
        throw new AppError(
            'userChannelId is required if userHasGlobalRole is false',
            400
        );

    const roles = await Role.findAll({ where: { id: roleIds } });
    if (!roles) throw new AppError('Roles not found', 404);

    const roleIdsLength = Array.isArray(roleIds) ? roleIds.length : 1;
    if (roleIdsLength != roles.length)
        throw new AppError('Some roles not found', 404);

    let unassignableRoleIds: any[] = [];

    roles.forEach((r) => {
        if ((userChannelId != null && r.channel_id != userChannelId) || userRoleLevel >= r.level) {
            unassignableRoleIds.push(r.id);
        }
    });

    return unassignableRoleIds.length == 0;
}

export async function findMissingRoles(
    roleIds: number | number[]
): Promise<number[]> {
    // Returns array of role IDs that don't exist
    roleIds = Array.isArray(roleIds) ? roleIds : [roleIds];
    const existingRoles = await Role.findAll({ where: { id: roleIds } });
    const existingIds = existingRoles.map((role) => role.id);

    return roleIds.filter((id) => !existingIds.includes(id));
}

/**
 * Gets the user's highest role level.
 *
 * @param userId - ID of the user to check roles for.
 * @param channelId - Optional channel ID to filter roles.
 *
 * - If `channelId` is not provided, all roles (global and channel-based) are considered.
 * - If `channelId` is provided, global roles and roles for the specified channel are considered.
 * - Prioritize global roles when finding the highest level
 */
export async function getUsersHigestRoleLevel(
    userId: number,
    channelId?: number
) {
    const user = await User.findByPk(userId);
    if (!user) throw new AppError('User not found', 404);

    const [highestLevelGlobalRole] = await user.getRoles({
        where: {
            channel_id: {
                [Op.eq]: null
            }
        },
        order: [['level', 'ASC']],
        limit: 1
    });

    if (highestLevelGlobalRole) {
        return highestLevelGlobalRole;
    }

    const channelIdCondition = channelId
        ? {
              [Op.eq]: channelId
          }
        : {
              [Op.ne]: null
          };

    const [highestLevelChannelBasedRole] = await user.getRoles({
        where: {
            channel_id: channelIdCondition
        },
        order: [['level', 'ASC']],
        limit: 1
    });

    if (!highestLevelChannelBasedRole) return null;

    return highestLevelChannelBasedRole;
}

/**
 *
 * @param firstUserId
 * @param secondUserId
 *
 * - Find the most privileged between the two users
 */
export async function isUserMorePrivilegedThan(
    firstUserId: number,
    secondUserId: number
): Promise<boolean> {
    const [firstRole, secondRole] = await Promise.all([
        getUsersHigestRoleLevel(firstUserId),
        getUsersHigestRoleLevel(secondUserId)
    ]);

    // Handle cases where one or both roles are null
    if (!firstRole && !secondRole) return false; // Neither has a role
    if (!firstRole) return false; // Only second user has a role
    if (!secondRole) return true; // Only first user has a role

    return isRoleHigher(firstRole, secondRole);
}

export async function isRoleHigher(firstRole: Role, secondRole: Role) {
    // Handle cases for different role scopes
    if (firstRole.scope == 'global' && secondRole.scope == 'channel')
        return true;
    if (firstRole.scope == 'channel' && secondRole.scope == 'global')
        return false;

    // Now TypeScript knows both roles are same value
    if (firstRole.level < secondRole.level) return true;

    return false;
}
