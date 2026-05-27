import { UserLevelType } from "../constants/enums";
import User from "../database/models/User";

const userLevels = Object.values(UserLevelType);

export async function isUserMorePrivileged(firstUser: User, secondUser: User){
    const firstUserLevelIndex = userLevels.indexOf(firstUser.level as UserLevelType);
    const secondUserLevelIndex = userLevels.indexOf(secondUser.level as UserLevelType);

    if (firstUserLevelIndex === -1 || secondUserLevelIndex === -1) {
        throw new Error('Invalid user level');
    }

    return firstUserLevelIndex < secondUserLevelIndex;
}