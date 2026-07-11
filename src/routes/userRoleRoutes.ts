import { Router } from 'express';
import userRoleController from '../controllers/userRoleController';
import hasAnyPermission from '../middlewares/hasAnyPermission';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { addValidator } from '../validators/user-role/addValidator';
import { deleteValidator } from '../validators/user-role/deleteValidator';
import { findValidator } from '../validators/user-role/findValidator';
import { replaceValidator } from '../validators/user-role/replaceValidator';

const userRoleRoutes = Router();

/**
 * @openapi
 * /api/user-role/user/{user_id}:
 *   get:
 *     summary: List the roles assigned to a user
 *     description: >
 *       Requires `auth:view:user_role` or `auth:admin:user_role` in the caller's
 *       current scope. No privilege-level or channel-ownership check on the
 *       target user for this read endpoint. When the caller is channel-scoped
 *       (not `x-api-key: global`), the returned roles are filtered to the
 *       caller's own channel; a global-scope caller sees all of the target
 *       user's roles across every channel.
 *     tags: [User-Role]
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
 *         description: Roles currently assigned to the user (scope-filtered as described above).
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Role'
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
 *         description: Missing/invalid x-api-key, or caller lacks the required permission.
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
userRoleRoutes.get(
    '/user/:user_id',
    hasAnyPermission(['auth:view:user_role', 'auth:admin:user_role'], false),
    validationMiddleware(findValidator),
    userRoleController.getUserRoles
);

/**
 * @openapi
 * /api/user-role/user/{user_id}:
 *   post:
 *     summary: Assign one or more roles to a user
 *     description: >
 *       Requires `auth:assign:user_role` or `auth:admin:user_role` in the
 *       caller's current scope. **Unlike Role-Policy, this controller enforces
 *       authorization via privilege-level comparison rather than channel
 *       ownership**: the caller must be more privileged (`isMorePrivileged`,
 *       comparing `level` rank) than the target user, regardless of channel.
 *       Every ref_name in `role_ref_names` must already exist as a Role (404
 *       listing any that don't). When channel-scoped, every requested role must
 *       also belong to the caller's own channel (403 otherwise, listing the
 *       out-of-channel ref_names). The caller must also already hold every role
 *       they're assigning (403, "not assignable by the auth user", otherwise) —
 *       unless the caller is superadmin/root-superadmin. **Note:** unlike
 *       replaceUserRoles/destroyUserRole below, this endpoint has no special
 *       guard blocking role changes to the `superadmin` account — only the
 *       general privilege-level comparison applies.
 *     tags: [User-Role]
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role_ref_names]
 *             properties:
 *               role_ref_names:
 *                 description: A single ref_name or an array of ref_names.
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *           example:
 *             role_ref_names: [channel_admin]
 *     responses:
 *       200:
 *         description: The user's full updated role list (after the add).
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Role'
 *       400:
 *         description: Validation failed.
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
 *         description: "Missing/invalid x-api-key; caller lacks the required permission; caller isn't more privileged than the target user (message: 'You can only assign roles to users with a lower privilege level than yourself'); or (channel-scoped key only) one or more requested roles don't belong to the caller's channel (message: 'Role ref names ... do not belong to your channel and cannot be assigned')."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found, or one or more requested role_ref_names don't exist as Roles.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRoleRoutes.post(
    '/user/:user_id',
    hasAnyPermission(['auth:assign:user_role', 'auth:admin:user_role'], false),
    validationMiddleware(addValidator),
    userRoleController.addUserRoles
);

/**
 * @openapi
 * /api/user-role/user/{user_id}:
 *   put:
 *     summary: Replace the full set of roles assigned to a user
 *     description: >
 *       Requires `auth:update:user_role` or `auth:admin:user_role` in the
 *       caller's current scope, plus the privilege-level comparison described on
 *       POST above. Additionally, a target user with `username: "superadmin"`
 *       can never have their roles replaced via this endpoint (403), regardless
 *       of caller privilege. Every ref_name in `role_ref_names` must already
 *       exist (404 otherwise), and when channel-scoped, every requested role
 *       must belong to the caller's own channel (403 otherwise). The caller must
 *       also already hold every role in the new full set (403 otherwise), unless
 *       superadmin/root-superadmin.
 *     tags: [User-Role]
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role_ref_names]
 *             properties:
 *               role_ref_names:
 *                 description: A single ref_name or an array of ref_names — this becomes the user's complete role list.
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *     responses:
 *       200:
 *         description: The user's new full set of roles.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Role'
 *       400:
 *         description: Validation failed.
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
 *         description: "Missing/invalid x-api-key; caller lacks the required permission; target user is 'superadmin' (message: \"Superadmin's roles cannot be updated\"); caller isn't more privileged than the target; or (channel-scoped key only) one or more requested roles don't belong to the caller's channel."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: User not found, or one or more requested role_ref_names don't exist as Roles.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRoleRoutes.put(
    '/user/:user_id',
    hasAnyPermission(['auth:update:user_role', 'auth:admin:user_role'], false),
    validationMiddleware(replaceValidator),
    userRoleController.replaceUserRoles
);

/**
 * @openapi
 * /api/user-role/user/{user_id}:
 *   delete:
 *     summary: Remove one or more roles from a user
 *     description: >
 *       Requires `auth:remove:user_role` or `auth:admin:user_role` in the
 *       caller's current scope, plus the privilege-level comparison and
 *       `username: "superadmin"` guard described on PUT above. Every ref_name in
 *       `role_ref_names` must already exist (404 otherwise), and when
 *       channel-scoped, every requested role must belong to the caller's own
 *       channel (403 otherwise). The caller must also already hold every role
 *       being removed (403 otherwise), unless superadmin/root-superadmin.
 *     tags: [User-Role]
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role_ref_names]
 *             properties:
 *               role_ref_names:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *     responses:
 *       200:
 *         description: The user's remaining roles after removal.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Role'
 *       400:
 *         description: Validation failed.
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
 *         description: "Missing/invalid x-api-key; caller lacks the required permission; target user is 'superadmin' (message: \"Superadmin's roles cannot be deleted\"); caller isn't more privileged than the target; or (channel-scoped key only) one or more requested roles don't belong to the caller's channel."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: >
 *           User not found, one or more requested role_ref_names don't exist as
 *           Roles, or the caller doesn't hold one of the roles being removed
 *           (message: "... are not deletable by the auth user" — uses 404 here
 *           rather than 403, unlike the equivalent checks elsewhere).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
userRoleRoutes.delete(
    '/user/:user_id',
    hasAnyPermission(['auth:remove:user_role', 'auth:admin:user_role'], false),
    validationMiddleware(deleteValidator),
    userRoleController.destroyUserRole
);

export default userRoleRoutes;
