import { Op } from 'sequelize';
import Role from '../database/models/Role';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';

export async function isRoleAssignable(
    roleIds: number | number[],
    channelId: number | null,
    isGlobalRole: boolean = false
): Promise<boolean> {
    // Global roles can assign any roles
    if (isGlobalRole) {
        return true;
    }

    let role = null;

    // Channel-based roles can only assign roles within their channel
    if (Array.isArray(roleIds)) {
        if (roleIds.length > 1) {
            return false;
        }
        role = await Role.findByPk(roleIds[0]);
    } else {
        role = await Role.findByPk(roleIds);
    }

    return role?.channel_id === channelId;
}

export async function findMissingRoles(roleIds: number | number[]): Promise<number[]> {
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
export async function getUsersHigestRoleLevel(userId: number, channelId?: number) {
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
        return {
            level: highestLevelGlobalRole.level,
            scope: highestLevelGlobalRole.scope
        };
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

    return {
        level: highestLevelChannelBasedRole.level,
        scope: highestLevelChannelBasedRole.scope
    };
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

    // Handle cases for different role scopes
    if (firstRole.scope == 'global' && secondRole.scope == 'channel') return true;
    if (firstRole.scope == 'channel' && secondRole.scope == 'global') return false;

    // Now TypeScript knows both roles are same value
    if (firstRole.level < secondRole.level) return true;

    return false;
}
