import { Router } from 'express';
import authController from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { checkApiKeyMiddleware } from '../middlewares/checkApiKeyMiddleware';
import { refreshTokenValidator } from '../validators/auth/refreshTokenValidator';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { generateTokenValidator } from '../validators/auth/generateTokenValidator';
import { destroyTokenValidator } from '../validators/auth/destroyTokenValidator';

const authRoutes = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     AuthTokenPayload:
 *       type: object
 *       description: Returned by generate-token and refresh-token.
 *       properties:
 *         user:
 *           allOf:
 *             - $ref: '#/components/schemas/User'
 *           description: The authenticated user (password excluded).
 *         permissions:
 *           type: array
 *           description: >
 *             Flattened, de-duplicated list of the user's permission ref_names for
 *             the current scope (global if x-api-key is "global", else the
 *             calling channel).
 *           items:
 *             type: string
 *           example: [auth:view:channel, auth:admin:role]
 *         tokens:
 *           type: object
 *           properties:
 *             access:
 *               type: object
 *               properties:
 *                 value:
 *                   type: string
 *                   description: "JWT access token. Send as `Authorization: Bearer <value>`. TTL 2 minutes."
 *                 expires_at:
 *                   type: integer
 *                   description: Unix epoch milliseconds.
 *             refresh:
 *               type: object
 *               properties:
 *                 value:
 *                   type: string
 *                   description: Opaque JWT refresh token. TTL 7 days. Single-use — rotated on every refresh.
 *                 expires_at:
 *                   type: integer
 *                   description: Unix epoch milliseconds.
 *
 * /api/auth/generate-token:
 *   post:
 *     summary: Log in with email/password and issue a token pair
 *     description: >
 *       Verifies credentials, then issues a fresh access/refresh token pair and
 *       returns the caller's user record and flattened permission list for the
 *       scope implied by the `x-api-key` header. No `bearerAuth` is required (you
 *       don't have a token yet) — only `apiKeyAuth`.
 *     tags: [Auth]
 *     security:
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *           example:
 *             email: jdoe@example.com
 *             password: correct-horse-battery-staple
 *     responses:
 *       200:
 *         description: Token pair issued.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokenPayload'
 *       400:
 *         description: Validation failed (email/password missing or malformed).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: "User not found, or invalid email/password (message: 'User not found' / 'Invalid email or password')."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Missing or invalid `x-api-key` header (checkApiKeyMiddleware always responds 403 for any API key problem, including a missing header).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
authRoutes.post('/generate-token', checkApiKeyMiddleware, validationMiddleware(generateTokenValidator), authController.generateToken);

/**
 * @openapi
 * /api/auth/refresh-token:
 *   post:
 *     summary: Exchange a refresh token for a new token pair
 *     description: >
 *       Rotates the refresh token (the old one is deleted and a new one issued
 *       inside a transaction) and issues a new access token. Only `apiKeyAuth` is
 *       required — the caller authenticates via the refresh token in the body, not
 *       a bearer token.
 *     tags: [Auth]
 *     security:
 *       - apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refresh_token]
 *             properties:
 *               refresh_token:
 *                 type: string
 *                 minLength: 2
 *     responses:
 *       200:
 *         description: New token pair issued.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokenPayload'
 *       400:
 *         description: Validation failed (refresh_token missing or too short).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Refresh token failed JWT verification (message "Invalid token").
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: >
 *           Invalid/missing `x-api-key` header; or `REFRESH_SECRET` is not
 *           configured server-side (message "Refresh token not found" — a
 *           misleading message for what is actually a server config error); or a
 *           concurrent refresh already rotated this token (message "Invalid
 *           token").
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: The user referenced by the refresh token no longer exists.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
authRoutes.post('/refresh-token', checkApiKeyMiddleware, validationMiddleware(refreshTokenValidator), authController.refreshToken);

/**
 * @openapi
 * /api/auth/destroy-token:
 *   post:
 *     summary: Revoke a refresh token (logout)
 *     description: >
 *       Deletes the refresh token row matching the token's `jti`. Unlike every
 *       other auth endpoint, this route requires **no authentication at all** —
 *       neither `bearerAuth` nor `apiKeyAuth` — only body validation runs before
 *       the controller.
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refresh_token]
 *             properties:
 *               refresh_token:
 *                 type: string
 *                 minLength: 2
 *     responses:
 *       200:
 *         description: >
 *           Logout processed. `deleted_refresh_token_rows` is 0 if the token was
 *           already revoked/expired/unknown — this is not treated as an error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logout successful
 *                 deleted_refresh_token_rows:
 *                   type: integer
 *                   example: 1
 *       400:
 *         description: Validation failed (refresh_token missing or too short).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Refresh token failed JWT verification (message "Invalid token").
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: >
 *           `REFRESH_SECRET` is not configured server-side (message "REFRESH_SECRET
 *           on env not set" — note this is a different message than the equivalent
 *           check in refresh-token).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
authRoutes.post('/destroy-token', validationMiddleware(destroyTokenValidator), authController.destroyToken);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Get the current caller's identity, channel, and roles
 *     description: >
 *       Returns the authenticated user (from the bearer token) merged with the
 *       roles they hold for the current channel scope (or global roles, i.e.
 *       `channel_id IS NULL`, if `x-api-key: global`), each role including its
 *       nested permissions.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     responses:
 *       200:
 *         description: Current identity.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 channel:
 *                   nullable: true
 *                   allOf:
 *                     - $ref: '#/components/schemas/Channel'
 *                   description: Null when `x-api-key` is "global".
 *                 user:
 *                   allOf:
 *                     - $ref: '#/components/schemas/User'
 *                   description: Includes a nested `roles` array (each with a nested `permissions` array) not present on the plain User schema.
 *       401:
 *         description: Missing/invalid/expired bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Missing or invalid `x-api-key` header.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
authRoutes.get('/me', authMiddleware, checkApiKeyMiddleware, authController.me);

/**
 * @openapi
 * /api/auth/verify-token:
 *   get:
 *     summary: Decode and verify the current bearer access token
 *     description: >
 *       Re-verifies the same `Authorization` bearer token authMiddleware already
 *       validated, and echoes back its decoded JWT payload. Mostly useful for
 *       debugging/introspection.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     responses:
 *       200:
 *         description: Token is valid.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 decoded:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     jti:
 *                       type: string
 *                       nullable: true
 *                     iat:
 *                       type: integer
 *                     exp:
 *                       type: integer
 *       401:
 *         description: Missing/invalid/expired bearer token (rejected by authMiddleware before this handler runs).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Missing or invalid `x-api-key` header.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
authRoutes.get('/verify-token', authMiddleware, checkApiKeyMiddleware, authController.verifyToken);

/**
 * @openapi
 * /api/auth/has-any-permission:
 *   get:
 *     summary: Check whether the current caller holds any of a set of permissions
 *     description: >
 *       Returns `{ status: 1 }` if the authenticated user has at least one of the
 *       given permission ref_names in the given role scope, otherwise responds
 *       403. **Unusual implementation detail:** despite being a `GET` route, this
 *       endpoint reads `permission_ref_names` and `role_scope` from the JSON
 *       request body (not query params), and that body is not run through any
 *       express-validator schema — malformed input is passed straight to the
 *       permission-checking service. Many HTTP clients/proxies strip bodies from
 *       GET requests, which would make those fields arrive as `undefined`; treat
 *       this endpoint as body-driven when calling it.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [permission_ref_names, role_scope]
 *             properties:
 *               permission_ref_names:
 *                 description: A single ref_name or an array of ref_names; the check passes if the user holds any one of them.
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *               role_scope:
 *                 type: string
 *                 description: "'channel' resolves against the calling channel (from x-api-key); requires a channel-scoped key, not 'global'."
 *                 enum: [global, channel, '*']
 *           example:
 *             permission_ref_names: [auth:view:channel, auth:admin:channel]
 *             role_scope: global
 *     responses:
 *       200:
 *         description: The caller holds at least one of the requested permissions.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 1
 *       400:
 *         description: "role_scope was 'channel' without a resolvable channelId (message: 'channelId is required when roleScope is channel')."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Missing/invalid/expired bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: "Missing/invalid x-api-key header, or the caller holds none of the requested permissions (message: 'Unauthorized')."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
authRoutes.get(
    '/has-any-permission',
    authMiddleware,
    checkApiKeyMiddleware,
    authController.hasAnyPermission
);

export default authRoutes;
