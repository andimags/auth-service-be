/**
 * Shape of both access and refresh token JWT payloads. Channel context is never
 * carried in the token — it's resolved per-request from the `x-api-key` header
 * (see checkApiKeyMiddleware) — so no `channel_id` field exists here.
 */
export interface IDecodedToken {
    id: number;
    jti?: string;
}

/** Role scope used when filtering a user's permissions/policies/roles; '*' matches both. */
export type RoleScopeFilter = 'global' | 'channel' | '*';
