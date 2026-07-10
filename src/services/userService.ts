import { UserLevelType, USER_LEVEL_RANK } from '../constants/enums';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';
import { HttpStatus } from '../constants/httpStatus';
import { RoleScopeFilter } from '../types';

export function isLevelMorePrivileged(
    higherLevel: UserLevelType,
    lowerLevel: UserLevelType
) {
    const higherRank = USER_LEVEL_RANK[higherLevel];
    const lowerRank = USER_LEVEL_RANK[lowerLevel];

    if (higherRank === undefined || lowerRank === undefined) {
        throw new Error('Invalid user level');
    }

    return higherRank > lowerRank;
}

export function isUserMorePrivileged(firstUser: User, secondUser: User): boolean {
    return isLevelMorePrivileged(
        firstUser.level as UserLevelType,
        secondUser.level as UserLevelType
    );
}

export async function canViewUser(
    authorizedUser: User,
    targetUserId: string,
    roleScope: RoleScopeFilter,
    channelId?: number
): Promise<boolean> {
    if (authorizedUser.isSuperadmin() || authorizedUser.isRootSuperadmin()) {
        return true;
    }

    if (authorizedUser.id.toString() === targetUserId) {
        return true;
    }

    return await authorizedUser.hasAnyPermission(
        ['auth:admin:user', 'auth:view:user'],
        roleScope,
        channelId
    );
}

/**
 * Validates that authorizedUser is allowed to apply requestedChanges to
 * targetUser, throwing an AppError if not. For self-updates, status/level
 * changes are silently stripped from requestedChanges rather than rejected.
 */
export async function applyUserUpdate(
    authorizedUser: User,
    targetUser: User,
    requestedChanges: Record<string, unknown>
): Promise<void> {
    const isSelfUpdate = targetUser.id === authorizedUser.id;

    if (isSelfUpdate) {
        delete requestedChanges.status;
        delete requestedChanges.level;
        return;
    }

    const isMorePrivilegedThanTarget = await authorizedUser.isMorePrivileged(targetUser);

    if (!isMorePrivilegedThanTarget) {
        throw new AppError(
            `You cannot update a user with level '${targetUser.level}'`,
            HttpStatus.FORBIDDEN
        );
    }

    if (requestedChanges.level) {
        const isMorePrivilegedThanNewLevel = await authorizedUser.isMorePrivilegedThanLevel(
            requestedChanges.level as UserLevelType
        );

        if (!isMorePrivilegedThanNewLevel) {
            throw new AppError(
                `You cannot assign a user the level '${requestedChanges.level}'`,
                HttpStatus.FORBIDDEN
            );
        }
    }
}
