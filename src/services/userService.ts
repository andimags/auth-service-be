import { UserLevelType, USER_LEVEL_RANK } from '../constants/enums';
import User from '../database/models/User';

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