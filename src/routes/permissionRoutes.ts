import { Router } from 'express';
import permissionController from '../controllers/permissionController';
import hasAnyPermission from '../middlewares/hasAnyPermission';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { addValidator } from '../validators/permission/addValidator';
import { deleteValidator } from '../validators/permission/deleteValidator';
import { findValidator } from '../validators/permission/findValidator';
import { updateValidator } from '../validators/permission/updateValidator';

const permissionRoutes = Router();

/**
 * @openapi
 * /api/permissions:
 *   get:
 *     summary: List permissions
 *     description: >
 *       Requires `auth:view:permission` or `auth:admin:permission` in the caller's
 *       current scope (global superadmin/root-superadmin using `x-api-key: global`
 *       bypasses this). If neither `page` nor `size` is supplied, returns a plain
 *       (unpaginated) JSON array of every permission — unlike Channels/Roles,
 *       Permission is not channel-scoped, so this list is never filtered by the
 *       caller's channel.
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 1-based page number. Omit (along with `size`) to get the unpaginated array instead.
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Case-insensitive substring match against name, description, ref_name.
 *       - in: query
 *         name: scope
 *         schema:
 *           type: string
 *           enum: [global, channel]
 *         description: >
 *           **Currently non-functional / buggy**: the code filters on a `scope`
 *           column that does not exist on the Permission model (Permission has no
 *           scope column — only Role does). Supplying this parameter is expected to
 *           cause a database error rather than filter results. Documented here to
 *           match current code, not as a working feature.
 *       - in: query
 *         name: access_level
 *         schema:
 *           type: string
 *           enum: [read, write, admin]
 *       - in: query
 *         name: is_system
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *       - in: query
 *         name: sort_field
 *         schema:
 *           type: string
 *         description: Any real column on the Permission model; silently ignored otherwise.
 *       - in: query
 *         name: sort_desc
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *     responses:
 *       200:
 *         description: Permission list.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/Permission'
 *                   description: Returned when neither page nor size is supplied.
 *                 - allOf:
 *                     - $ref: '#/components/schemas/PaginatedResponse'
 *                     - type: object
 *                       properties:
 *                         rows:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Permission'
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
permissionRoutes.get(
    '/',
    hasAnyPermission(['auth:view:permission', 'auth:admin:permission'], false),
    permissionController.getAll
);

/**
 * @openapi
 * /api/permissions/{permission_id}:
 *   get:
 *     summary: Get a permission by ID
 *     description: >
 *       Requires `auth:view:permission` or `auth:admin:permission` in the caller's
 *       current scope (route-level gate). **Additionally**, when the caller is
 *       channel-scoped (not `x-api-key: global`), the caller must also hold the
 *       *target* permission's own `ref_name` — i.e. you can only look up a
 *       permission you yourself have been granted, on top of the general
 *       view-permission grant. This extra check does not apply when
 *       `x-api-key: global`.
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: permission_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: The permission.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Permission'
 *       400:
 *         description: permission_id is missing or not an integer.
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
 *         description: "Missing/invalid x-api-key; caller lacks the route-level permission; or (channel-scoped key only) caller doesn't hold the target permission's own ref_name (message: 'You are not authorized to view this permission')."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Permission not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
permissionRoutes.get(
    '/:permission_id',
    hasAnyPermission(['auth:view:permission', 'auth:admin:permission'], false),
    validationMiddleware(findValidator),
    permissionController.find
);

/**
 * @openapi
 * /api/permissions:
 *   post:
 *     summary: Create a permission
 *     description: >
 *       Requires `auth:add:permission` or `auth:admin:permission` in the caller's
 *       current scope. No channel-ownership or target-permission check applies to
 *       create (unlike find/update).
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, ref_name, module, access_level]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *               description:
 *                 type: string
 *               ref_name:
 *                 type: string
 *                 description: Letters, numbers, colons, underscores, or dashes between words. Must be unique across all permissions.
 *                 pattern: '^[a-zA-Z0-9:]+([_-][a-zA-Z0-9:]+)*$'
 *               module:
 *                 type: string
 *                 minLength: 2
 *               access_level:
 *                 type: string
 *                 enum: [read, write, admin]
 *           example:
 *             name: View Channel
 *             ref_name: auth:view:channel
 *             module: channel
 *             access_level: read
 *     responses:
 *       200:
 *         description: Permission created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Permission'
 *       400:
 *         description: Validation failed, or (via the model's BeforeCreate hook) attempting to set is_system directly.
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
 *         description: "Missing/invalid x-api-key; caller lacks the required permission; or is_system was true (message: 'System permissions must be seeded and cannot be created or modified manually')."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
permissionRoutes.post(
    '/',
    hasAnyPermission(['auth:add:permission', 'auth:admin:permission'], false),
    validationMiddleware(addValidator),
    permissionController.add
);

/**
 * @openapi
 * /api/permissions/{permission_id}:
 *   put:
 *     summary: Update a permission
 *     description: >
 *       Requires `auth:update:permission` or `auth:admin:permission` in the
 *       caller's current scope (route-level gate). **Additionally**, when the
 *       caller is channel-scoped, the caller must also hold the *target*
 *       permission's own `ref_name` (same extra check as GET
 *       /{permission_id} — see that endpoint's description). Note that, unlike
 *       most other update validators in this API, every field here is
 *       **required**, not optional — this is effectively a full replace, not a
 *       partial patch.
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: permission_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, ref_name, module, access_level]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *               description:
 *                 type: string
 *               ref_name:
 *                 type: string
 *                 description: Must be unique across all permissions (uniqueness check here is NOT excluded for the current record — see known-issue note below).
 *                 pattern: '^[a-zA-Z0-9:]+([_-][a-zA-Z0-9:]+)*$'
 *               module:
 *                 type: string
 *                 minLength: 2
 *               access_level:
 *                 type: string
 *                 enum: [read, write, admin]
 *     responses:
 *       200:
 *         description: Updated permission.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Permission'
 *       400:
 *         description: >
 *           Validation failed. Note: `isUniqueField(Permission, 'ref_name', 'ref
 *           name')` is called here without the `paramName` argument used elsewhere
 *           (e.g. channel/role update validators pass their id param so the record
 *           being updated is excluded from the uniqueness check) — submitting the
 *           permission's own unchanged ref_name back on update may incorrectly
 *           fail as "already exists".
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
 *         description: "Missing/invalid x-api-key; caller lacks the route-level permission; caller (channel-scoped) doesn't hold the target permission's own ref_name; or is_system is true on the target (message: 'System permissions must be seeded and cannot be created or modified manually')."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Permission not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
permissionRoutes.put(
    '/:permission_id',
    hasAnyPermission(['auth:update:permission', 'auth:admin:permission'], false),
    validationMiddleware(updateValidator),
    permissionController.update
);

/**
 * @openapi
 * /api/permissions/{permission_id}:
 *   delete:
 *     summary: Delete (soft or hard) a permission
 *     description: >
 *       Requires `auth:delete:permission` or `auth:admin:permission` on a
 *       **global-scope** role (this route does not pass `requireGlobalRole:
 *       false`) — a channel-scoped API key cannot delete permissions even with a
 *       channel-scoped grant, unless the caller is a superadmin/root-superadmin
 *       using `x-api-key: global`. Unlike find/update, destroy has **no**
 *       target-permission-ownership check. By default this is a soft delete;
 *       pass `force=true` to hard-delete. System permissions (`is_system: true`)
 *       cannot be deleted (soft or hard) regardless of permission grants.
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: permission_id
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
 *                   example: Permission successfully soft-deleted
 *       401:
 *         description: Missing/invalid/expired bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: "Missing/invalid x-api-key; caller lacks a global-scope grant of the required permission; or the target is a system permission (message: 'System permissions cannot be deleted')."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Permission not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
permissionRoutes.delete(
    '/:permission_id',
    hasAnyPermission(['auth:delete:permission', 'auth:admin:permission']),
    validationMiddleware(deleteValidator),
    permissionController.destroy
);

export default permissionRoutes;
