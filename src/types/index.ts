export interface IDecodedToken {
    id: number;
    channel_id: number;
    jti?: string;
}

/** Role scope used when filtering a user's permissions/policies/roles; '*' matches both. */
export type RoleScopeFilter = 'global' | 'channel' | '*';
