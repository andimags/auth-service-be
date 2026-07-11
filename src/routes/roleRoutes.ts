import { Router } from 'express';
import roleController from '../controllers/roleController';
import hasAnyPermission from '../middlewares/hasAnyPermission';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { addValidator } from '../validators/role/addValidator';
import { deleteValidator } from '../validators/role/deleteValidator';
import { findValidator } from '../validators/role/findValidator';
import { updateValidator } from '../validators/role/updateValidator';

const roleRoutes = Router();

/**
 * @openapi
 * /api/roles:
 *   get:
 *     summary: List roles
 *     description: >
 *       Requires `auth:view:role` or `auth:admin:role` in the caller's current
 *       scope. **Known inconsistency:** when paginating (`page`/`size` supplied),
 *       results are correctly scoped to the caller's own channel
 *       (`channel_id = req.channel.id`) for a channel-scoped API key. When
 *       neither `page` nor `size` is supplied, however, the unpaginated branch
 *       calls `Role.findAll()` with **no channel filter at all** — a
 *       channel-scoped API key hitting this endpoint without pagination params
 *       currently receives every role across every channel, not just its own.
 *       Documented here as actual current behavior; flagged separately as a
 *       likely bug, not fixed as part of this documentation pass.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 1-based page number. Omit (along with `size`) to get the unpaginated array instead (see channel-scoping caveat above).
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
 *         description: Only applied on the paginated path.
 *       - in: query
 *         name: sort_field
 *         schema:
 *           type: string
 *         description: Any real column on the Role model; silently ignored otherwise.
 *       - in: query
 *         name: sort_desc
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *     responses:
 *       200:
 *         description: Role list. Each row includes its nested `channel` (paginated path only — the unpaginated path returns bare Role rows without the association loaded).
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/Role'
 *                   description: Returned when neither page nor size is supplied.
 *                 - allOf:
 *                     - $ref: '#/components/schemas/PaginatedResponse'
 *                     - type: object
 *                       properties:
 *                         rows:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Role'
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
roleRoutes.get(
    '/',
    hasAnyPermission(['auth:view:role', 'auth:admin:role'], false),
    roleController.getAll
);

/**
 * @openapi
 * /api/roles/{role_id}:
 *   get:
 *     summary: Get a role by ID
 *     description: >
 *       Requires `auth:view:role` or `auth:admin:role` in the caller's current
 *       scope. A channel-scoped API key can only view roles belonging to its own
 *       channel — this includes being blocked from viewing global-scope roles
 *       (`channel_id: null`), since `null` never equals the caller's channel id.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: role_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: The role, including its nested `channel`.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Role'
 *       400:
 *         description: role_id is missing or not an integer.
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
 *         description: "Missing/invalid x-api-key; caller lacks the required permission; or (channel-scoped key only) the role belongs to a different channel or is global-scope (message: 'Unauthorized to access roles outside your channel')."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Role not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
roleRoutes.get(
    '/:role_id',
    hasAnyPermission(['auth:view:role', 'auth:admin:role'], false),
    validationMiddleware(findValidator),
    roleController.find
);

/**
 * @openapi
 * /api/roles:
 *   post:
 *     summary: Create a role
 *     description: >
 *       Requires `auth:add:role` or `auth:admin:role` in the caller's current
 *       scope. If `channel_id` is supplied it must reference an existing channel
 *       (400 otherwise). A channel-scoped API key must set `channel_id` to its
 *       own channel's id — omitting it, or supplying a different channel's id,
 *       is rejected with 403; only a global-scope caller (`x-api-key: global`)
 *       can create roles with a null `channel_id` (global-scope roles) or on
 *       behalf of an arbitrary channel. **Known inconsistency:** `ref_name`
 *       uniqueness is enforced **globally** here (across all roles regardless of
 *       scope), while the update endpoint below enforces uniqueness only
 *       **within the same `scope`** — the two validators disagree on the
 *       uniqueness key for the same field. This is not deliberate design; treat
 *       both behaviors as-is rather than assuming either is the "correct" one.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, ref_name, scope]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *               description:
 *                 type: string
 *               ref_name:
 *                 type: string
 *                 description: Letters, numbers, colons, underscores, or dashes between words. Must be unique across ALL roles (any scope) on create.
 *                 pattern: '^[a-zA-Z0-9:]+([_-][a-zA-Z0-9:]+)*$'
 *               channel_id:
 *                 type: integer
 *                 nullable: true
 *                 minimum: 1
 *               scope:
 *                 type: string
 *                 enum: [global, channel]
 *           example:
 *             name: Channel Admin
 *             ref_name: channel_admin
 *             scope: channel
 *             channel_id: 1
 *     responses:
 *       200:
 *         description: Role created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Role'
 *       400:
 *         description: Validation failed (including duplicate ref_name globally), or channel_id was supplied but does not reference an existing channel.
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
 *         description: "Missing/invalid x-api-key; caller lacks the required permission; or (channel-scoped key only) channel_id doesn't match the caller's own channel (message: 'You can only add roles within your channel')."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
roleRoutes.post(
    '/',
    hasAnyPermission(['auth:add:role', 'auth:admin:role'], false),
    validationMiddleware(addValidator),
    roleController.add
);

/**
 * @openapi
 * /api/roles/{role_id}:
 *   put:
 *     summary: Update a role
 *     description: >
 *       Requires `auth:update:role` or `auth:admin:role` in the caller's current
 *       scope. A channel-scoped API key can only update roles in its own channel
 *       (same rule as GET /{role_id} — global-scope roles are unreachable to a
 *       channel-scoped key). All body fields are optional (partial update).
 *       **Known inconsistency:** `ref_name` uniqueness is enforced only
 *       **within the same `scope`** here (via `checkUniqueRefNameScope`), unlike
 *       create above which enforces uniqueness globally — see the note on POST
 *       /api/roles. Separately, the model has a `@BeforeUpdate` hook that throws
 *       a plain (non-`AppError`) exception if `channel_id` is changed after
 *       creation — that surfaces as a generic 500, not a 400/403, because it
 *       isn't wrapped in `AppError`. The `level` field accepted by this
 *       validator does not correspond to any actual column on the Role model
 *       (the model has no `level` field) — it is validated but has no effect.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: role_id
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
 *               name:
 *                 type: string
 *                 minLength: 2
 *               description:
 *                 type: string
 *               ref_name:
 *                 type: string
 *                 description: Must be unique within the role's scope (global or channel) — not globally unique.
 *                 pattern: '^[a-zA-Z0-9:]+([_-][a-zA-Z0-9:]+)*$'
 *               channel_id:
 *                 type: integer
 *                 description: Changing this after creation throws an unhandled (non-AppError) exception — currently surfaces as a 500.
 *               scope:
 *                 type: string
 *                 enum: [global, channel]
 *               level:
 *                 type: integer
 *                 minimum: 1
 *                 description: Validated but not a real column on the Role model — has no persisted effect.
 *     responses:
 *       200:
 *         description: Updated role.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Role'
 *       400:
 *         description: Validation failed (including duplicate ref_name within the same scope).
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
 *         description: "Missing/invalid x-api-key; caller lacks the required permission; or (channel-scoped key only) the role isn't in the caller's channel (message: 'You can only update roles within your channel')."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Role not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Attempted to change channel_id after creation (unhandled exception from the model hook).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
roleRoutes.put(
    '/:role_id',
    hasAnyPermission(['auth:update:role', 'auth:admin:role'], false),
    validationMiddleware(updateValidator),
    roleController.update
);

/**
 * @openapi
 * /api/roles/{role_id}:
 *   delete:
 *     summary: Delete (soft or hard) a role
 *     description: >
 *       Requires `auth:delete:role` or `auth:admin:role` in the caller's current
 *       scope (this route passes `requireGlobalRole: false`, so a channel-scoped
 *       grant is sufficient — unlike Channel/Permission/User delete). A
 *       channel-scoped API key can only delete roles in its own channel. By
 *       default this is a soft delete; pass `force=true` to hard-delete.
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: role_id
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
 *                   example: Role successfully soft-deleted
 *       401:
 *         description: Missing/invalid/expired bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: "Missing/invalid x-api-key; caller lacks the required permission; or (channel-scoped key only) the role isn't in the caller's channel (message: 'You can only delete roles within your channel')."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Role not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
roleRoutes.delete(
    '/:role_id',
    hasAnyPermission(['auth:delete:role', 'auth:admin:role'], false),
    validationMiddleware(deleteValidator),
    roleController.destroy
);

export default roleRoutes;
