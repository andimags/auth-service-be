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
