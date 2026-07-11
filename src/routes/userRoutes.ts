import { Router } from 'express';
import userController from '../controllers/userController';
import hasAnyPermission from '../middlewares/hasAnyPermission';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { addValidator } from '../validators/user/addValidator';
import { deleteValidator } from '../validators/user/deleteValidator';
import { findValidator } from '../validators/user/findValidator';
import { updateValidator } from '../validators/user/updateValidator';

const userRoutes = Router();

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: List users
 *     description: >
 *       Requires `auth:view:user` or `auth:admin:user` in the caller's current
 *       scope. Unlike Channels/Permissions/Policies/Roles, this endpoint **always**
 *       returns the paginated envelope — there is no unpaginated fallback when
 *       `page`/`size` are omitted (both default, to 1 and 10 respectively).
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Case-insensitive substring match against username, email, first_name, last_name.
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive]
 *       - in: query
 *         name: sort_field
 *         schema:
 *           type: string
 *         description: Any real column on the User model; silently ignored otherwise.
 *       - in: query
 *         name: sort_desc
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *     responses:
 *       200:
 *         description: Paginated user list.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     rows:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *       401:
 *         description: Missing/invalid/expired bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Missing/invalid x-api-key, or caller lacks the required permission.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRoutes.get(
    '/',
    hasAnyPermission(['auth:view:user', 'auth:admin:user'], false),
    userController.getAll
);

/**
 * @openapi
 * /api/users/{user_id}:
 *   get:
 *     summary: Get a user by ID
 *     description: >
 *       **No route-level permission middleware is applied here** — unlike every
 *       other resource's find endpoint. Authorization is enforced inline by
 *       `userService.canViewUser`: a superadmin/root-superadmin, or the caller
 *       viewing their **own** user_id, is always allowed regardless of RBAC
 *       grants; any other target user requires `auth:view:user` or
 *       `auth:admin:user` in the caller's current scope, checked the same way the
 *       route-level middleware would.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: The user.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: user_id is missing or not an integer.
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
 *         description: "Missing/invalid x-api-key; or caller is viewing someone else's profile without auth:view:user/auth:admin:user (message: 'You do not have the required permissions to perform this action')."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRoutes.get(
    '/:user_id',
    validationMiddleware(findValidator),
    userController.find
);

/**
 * @openapi
 * /api/users:
 *   post:
 *     summary: Create a user
 *     description: >
 *       Requires `auth:add:user` or `auth:admin:user` in the caller's current
 *       scope. Additionally, the caller must be more privileged (higher
 *       `level` rank) than the `level` being assigned to the new user — this
 *       defaults to `member` if `level` is omitted, so any caller above `member`
 *       rank can create a default user. `password` is hashed server-side
 *       (`@BeforeValidate` hook) and is never present in the response.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, first_name, last_name, password]
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 description: Must be unique.
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Must be unique.
 *               first_name:
 *                 type: string
 *                 minLength: 2
 *                 pattern: "^[a-zA-Z\\s'-]+$"
 *               last_name:
 *                 type: string
 *                 minLength: 2
 *                 pattern: "^[a-zA-Z\\s'-]+$"
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 default: active
 *               level:
 *                 type: string
 *                 enum: [root_superadmin, superadmin, admin, manager, moderator, member]
 *                 default: member
 *                 description: root_superadmin cannot actually be assigned — the model's @BeforeCreate hook rejects any attempt to create a second root_superadmin.
 *               password:
 *                 type: string
 *                 minLength: 8
 *           example:
 *             username: jdoe
 *             email: jdoe@example.com
 *             first_name: John
 *             last_name: Doe
 *             password: correct-horse-battery-staple
 *     responses:
 *       200:
 *         description: User created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation failed (missing/short fields, malformed email/names, duplicate username/email, invalid level/status).
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
 *         description: "Missing/invalid x-api-key; caller lacks the required permission; caller isn't more privileged than the requested level (message: \"You cannot create a user with level '<level>'\"); or an attempt was made to create a second root_superadmin."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRoutes.post(
    '/',
    hasAnyPermission(['auth:add:user', 'auth:admin:user'], false),
    validationMiddleware(addValidator),
    userController.add
);

/**
 * @openapi
 * /api/users/{user_id}:
 *   put:
 *     summary: Update a user
 *     description: >
 *       **No route-level permission middleware is applied here** — unlike every
 *       other resource's update endpoint. Authorization is enforced inline by
 *       `userService.applyUserUpdate`. Self-updates (caller updating their own
 *       user_id) are always allowed, but `status` and `level` are silently
 *       stripped from the request body first — a user can never change their own
 *       status or level this way, even though no error is returned. For updates
 *       to a different user, the caller must be more privileged than the target
 *       user, and if `level` is included, the caller must also be more
 *       privileged than the new level being assigned. There is no separate RBAC
 *       permission check at all on this route (only the privilege-level
 *       comparison).
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *               email:
 *                 type: string
 *                 format: email
 *               first_name:
 *                 type: string
 *                 minLength: 2
 *                 pattern: "^[a-zA-Z\\s'-]+$"
 *               last_name:
 *                 type: string
 *                 minLength: 2
 *                 pattern: "^[a-zA-Z\\s'-]+$"
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 description: Silently dropped when the caller is updating their own account.
 *               level:
 *                 type: string
 *                 enum: [root_superadmin, superadmin, admin, manager, moderator, member]
 *                 description: Silently dropped when the caller is updating their own account.
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Updated user.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation failed (including duplicate username/email against another user).
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
 *         description: "Missing/invalid x-api-key; caller (updating someone else) isn't more privileged than the target (message: \"You cannot update a user with level '<level>'\"); or caller isn't more privileged than the new level being assigned (message: \"You cannot assign a user the level '<level>'\")."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRoutes.put(
    '/:user_id',
    validationMiddleware(updateValidator),
    userController.update
);

/**
 * @openapi
 * /api/users/{user_id}:
 *   delete:
 *     summary: Delete (soft or hard) a user
 *     description: >
 *       Requires `auth:delete:user` or `auth:admin:user` on a **global-scope**
 *       role (this route does not pass `requireGlobalRole: false`) — a
 *       channel-scoped API key cannot delete users even with a channel-scoped
 *       grant, unless the caller is a superadmin/root-superadmin using
 *       `x-api-key: global`. On top of that, the caller must be strictly more
 *       privileged than the target user (equal or higher privilege/level than
 *       the caller cannot be deleted, including by another user of the same
 *       level). The root_superadmin account additionally cannot be deleted at
 *       all (model `@BeforeDestroy` hook), regardless of caller privilege. By
 *       default this is a soft delete; pass `force=true` to hard-delete.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: force
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *         description: When "true", permanently deletes the row instead of soft-deleting it.
 *     responses:
 *       200:
 *         description: Deletion result.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User successfully soft-deleted
 *       401:
 *         description: Missing/invalid/expired bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: "Missing/invalid x-api-key; caller lacks a global-scope grant of the required permission; caller isn't strictly more privileged than the target (message: \"You can't delete a user with the same or higher privilege / role level than you\"); or the target is the root_superadmin (message: 'Root superadmin user cannot be deleted')."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRoutes.delete(
    '/:user_id',
    hasAnyPermission(['auth:delete:user', 'auth:admin:user']),
    validationMiddleware(deleteValidator),
    userController.destroy
);

export default userRoutes;
