export enum UserStatusType {
    active = 'active',
    inactive = 'inactive'
}

export enum UserLevelType {
    root_superadmin = 'root_superadmin', // <-- The single, un-deletable initialization account
    superadmin = 'superadmin',           // <-- Human superadmins assigned via the system
    admin = 'admin',
    manager = 'manager',
    moderator = 'moderator',
    member = 'member'
}

export const USER_LEVEL_RANK: Readonly<Record<UserLevelType, number>> = {
    [UserLevelType.root_superadmin]: 6,
    [UserLevelType.superadmin]: 5,
    [UserLevelType.admin]: 4,
    [UserLevelType.manager]: 3,
    [UserLevelType.moderator]: 2,
    [UserLevelType.member]: 1,
};

export enum PermissionScopeType {
    global = 'global',
    channel = 'channel'
}

export enum PermissionAccessLevelType {
    read = 'read',
    write = 'write',
    admin = 'admin'
}

export enum RoleScopeType {
    global = 'global',
    channel = 'channel'
}
