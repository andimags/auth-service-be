import { Router } from 'express';
import policyController from '../controllers/policyController';
import hasAnyPermission from '../middlewares/hasAnyPermission';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { addValidator } from '../validators/policy/addValidator';
import { deleteValidator } from '../validators/policy/deleteValidator';
import { findValidator } from '../validators/policy/findValidator';
import { updateValidator } from '../validators/policy/updateValidator';

const policyRoutes = Router();

/**
 * @openapi
 * /api/policies:
 *   get:
 *     summary: List policies
 *     description: >
 *       Requires `auth:view:policy` or `auth:admin:policy` in the caller's current
 *       scope. Policy is a shared/global resource with no `channel_id` column, so
 *       results are never filtered by the caller's channel. If neither `page` nor
 *       `size` is supplied, returns a plain (unpaginated) JSON array. **Unique to
 *       this endpoint:** the paginated response is wrapped with an extra
 *       `status: 1` field alongside `count`/`rows`/`totalPages`/`currentPage` —
 *       no other list endpoint in this API does this.
 *     tags: [Policies]
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
 *         name: sort_field
 *         schema:
 *           type: string
 *         description: Any real column on the Policy model; silently ignored otherwise.
 *       - in: query
 *         name: sort_desc
 *         schema:
 *           type: string
 *           enum: ['true', 'false']
 *     responses:
 *       200:
 *         description: Policy list.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: array
 *                   items:
 *                     $ref: '#/components/schemas/Policy'
 *                   description: Returned when neither page nor size is supplied.
 *                 - allOf:
 *                     - type: object
 *                       properties:
 *                         status:
 *                           type: integer
 *                           example: 1
 *                     - $ref: '#/components/schemas/PaginatedResponse'
 *                     - type: object
 *                       properties:
 *                         rows:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Policy'
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
policyRoutes.get(
    '/',
    hasAnyPermission(['auth:view:policy', 'auth:admin:policy'], false),
    policyController.getAll
);

/**
 * @openapi
 * /api/policies/{policy_id}:
 *   get:
 *     summary: Get a policy by ID
 *     description: >
 *       Requires `auth:view:policy` or `auth:admin:policy` in the caller's current
 *       scope. Policy is a shared/global resource — there is no channel-ownership
 *       check here (or on add/update/destroy below); any caller holding the
 *       permission, channel-scoped or global, can view any policy.
 *     tags: [Policies]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: policy_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: The policy.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Policy'
 *       400:
 *         description: policy_id is missing or not an integer.
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
 *         description: Policy not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
policyRoutes.get(
    '/:policy_id',
    hasAnyPermission(['auth:view:policy', 'auth:admin:policy'], false),
    validationMiddleware(findValidator),
    policyController.find
);

/**
 * @openapi
 * /api/policies:
 *   post:
 *     summary: Create a policy
 *     description: >
 *       Requires `auth:add:policy` or `auth:admin:policy` in the caller's current
 *       scope. Policy is a shared/global resource: **no channel-ownership check
 *       is performed** — a channel-scoped API key holding this permission can
 *       create a policy that any other channel's roles may later attach to. This
 *       mirrors the schema (Policy has no `channel_id`) rather than being an
 *       oversight, but it is a real blast-radius consideration for channel-scoped
 *       API keys.
 *     tags: [Policies]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, ref_name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *               description:
 *                 type: string
 *               ref_name:
 *                 type: string
 *                 description: Letters, numbers, colons, underscores, or dashes between words. Must be unique across all policies.
 *                 pattern: '^[a-zA-Z0-9:]+([_-][a-zA-Z0-9:]+)*$'
 *               is_system:
 *                 type: boolean
 *                 description: If true, creation is rejected — system policies must be seeded, not created via the API.
 *           example:
 *             name: Channel Management
 *             ref_name: channel_management
 *     responses:
 *       200:
 *         description: Policy created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Policy'
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
 *         description: "Missing/invalid x-api-key; caller lacks the required permission; or is_system was true (message: 'System policies must be seeded and cannot be created or modified manually')."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
policyRoutes.post(
    '/',
    hasAnyPermission(['auth:add:policy', 'auth:admin:policy'], false),
    validationMiddleware(addValidator),
    policyController.add
);

/**
 * @openapi
 * /api/policies/{policy_id}:
 *   put:
 *     summary: Update a policy
 *     description: >
 *       Requires `auth:update:policy` or `auth:admin:policy` in the caller's
 *       current scope. **No channel-ownership check** — same caveat as create
 *       above; any caller with the permission can update any policy regardless of
 *       which channel(s)' roles use it. All body fields except `name`/`ref_name`
 *       are optional.
 *     tags: [Policies]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: policy_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, ref_name]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *               description:
 *                 type: string
 *               ref_name:
 *                 type: string
 *                 description: Must be unique across all policies (excluding this record).
 *                 pattern: '^[a-zA-Z0-9:]+([_-][a-zA-Z0-9:]+)*$'
 *               is_system:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated policy.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Policy'
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
 *         description: "Missing/invalid x-api-key; caller lacks the required permission; or the target is a system policy (message: 'System policies must be seeded and cannot be created or modified manually')."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Policy not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
policyRoutes.put(
    '/:policy_id',
    hasAnyPermission(['auth:update:policy', 'auth:admin:policy'], false),
    validationMiddleware(updateValidator),
    policyController.update
);

/**
 * @openapi
 * /api/policies/{policy_id}:
 *   delete:
 *     summary: Delete (soft or hard) a policy
 *     description: >
 *       Requires `auth:delete:policy` or `auth:admin:policy` in the caller's
 *       current scope (this route passes `requireGlobalRole: false`, so a
 *       channel-scoped grant is sufficient — unlike Channel/Permission/User
 *       delete). **No channel-ownership check** — same caveat as
 *       create/update above. By default this is a soft delete; pass
 *       `force=true` to hard-delete. System policies cannot be deleted at all.
 *     tags: [Policies]
 *     security:
 *       - bearerAuth: []
 *         apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: policy_id
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
 *                   example: Policy successfully soft-deleted
 *       401:
 *         description: Missing/invalid/expired bearer token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: "Missing/invalid x-api-key; caller lacks the required permission; or the target is a system policy (message: 'System policies cannot be deleted')."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Policy not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
policyRoutes.delete(
    '/:policy_id',
    hasAnyPermission(['auth:delete:policy', 'auth:admin:policy'], false),
    validationMiddleware(deleteValidator),
    policyController.destroy
);

export default policyRoutes;
