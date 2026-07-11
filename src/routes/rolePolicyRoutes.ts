import { Router } from 'express';
import RolePolicyController from '../controllers/rolePolicyController';
import hasAnyPermission from '../middlewares/hasAnyPermission';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { addValidator } from '../validators/role-policy/addValidator';
import { deleteValidator } from '../validators/role-policy/deleteValidator';
import { findValidator } from '../validators/role-policy/findValidator';
import { replaceValidator } from '../validators/role-policy/replaceValidator';

const rolePolicyRoutes = Router();

/**
 * @openapi
 * /api/role-policy/role/{role_id}:
 *   get:
 *     summary: List the policies attached to a role
 *     description: >
 *       Requires `auth:view:role_policy` or `auth:admin:role_policy` in the
 *       caller's current scope. **Unlike Policy-Permission, this controller
 *       enforces channel ownership**: a channel-scoped API key can only view
 *       policies for a role that belongs to its own channel (global-scope roles,
 *       `channel_id: null`, are unreachable to a channel-scoped key, same as
 *       Roles' own find endpoint).
 *     tags: [Role-Policy]
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
 *         description: Policies currently attached to the role.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Policy'
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
 *         description: "Missing/invalid x-api-key; caller lacks the required permission; or (channel-scoped key only) the role isn't in the caller's channel (message: \"Unauthorized to view this role's permissions\")."
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
rolePolicyRoutes.get(
    '/role/:role_id',
    hasAnyPermission(['auth:view:role_policy', 'auth:admin:role_policy'], false),
    validationMiddleware(findValidator),
    RolePolicyController.getRolePolicies
);

/**
 * @openapi
 * /api/role-policy/role/{role_id}:
 *   post:
 *     summary: Attach one or more policies to a role
 *     description: >
 *       Requires `auth:assign:role_policy` or `auth:admin:role_policy` in the
 *       caller's current scope. **Channel-ownership check**: a channel-scoped API
 *       key can only assign policies to a role in its own channel. Every
 *       ref_name in `policy_ref_names` must already exist as a Policy (404
 *       listing any that don't). When channel-scoped, system/global policies
 *       (`is_system: true`) cannot be assigned this way (403). The caller must
 *       also already hold every policy they're assigning (403, "not assignable
 *       by the auth user", otherwise), unless superadmin/root-superadmin.
 *     tags: [Role-Policy]
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [policy_ref_names]
 *             properties:
 *               policy_ref_names:
 *                 description: A single ref_name or an array of ref_names.
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *           example:
 *             policy_ref_names: [channel_management]
 *     responses:
 *       200:
 *         description: The policies that were added (full Policy records for the requested ref_names).
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Policy'
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
 *         description: "Missing/invalid x-api-key; caller lacks the required permission; (channel-scoped key only) the role isn't in the caller's channel (message: 'Unauthorized to add policies to this role'); or one or more requested policies are system/global (message: 'Global policies cannot be assigned using a channel-scoped API key')."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Role not found, or one or more requested policy_ref_names don't exist as Policies.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
rolePolicyRoutes.post(
    '/role/:role_id',
    hasAnyPermission(
        ['auth:assign:role_policy', 'auth:admin:role_policy'],
        false
    ),
    validationMiddleware(addValidator),
    RolePolicyController.addRolePolicies
);

/**
 * @openapi
 * /api/role-policy/role/{role_id}:
 *   put:
 *     summary: Replace the full set of policies attached to a role
 *     description: >
 *       Requires `auth:update:role_policy` or `auth:admin:role_policy` in the
 *       caller's current scope, plus the channel-ownership check described on
 *       GET above. Every ref_name in `policy_ref_names` must already exist
 *       (404 otherwise). When channel-scoped, this endpoint additionally forbids
 *       the request from introducing any new system/global policy, or dropping
 *       (by omission) any system/global policy the role already has (403 either
 *       way). Unlike POST/DELETE on this resource, the "caller must already hold
 *       every policy being set" check here is implemented correctly (checks the
 *       actual requested ref_names).
 *     tags: [Role-Policy]
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [policy_ref_names]
 *             properties:
 *               policy_ref_names:
 *                 description: A single ref_name or an array of ref_names — this becomes the role's complete policy set.
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *     responses:
 *       200:
 *         description: The role's new full set of policies.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Policy'
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
 *         description: "Missing/invalid x-api-key; caller lacks the required permission; (channel-scoped key only) the role isn't in the caller's channel, or the request adds/removes a system/global policy; or the caller doesn't hold one or more of the requested policies themselves (message: 'Policy ref names ... are not assignable by the auth user', returned with a 404 status)."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Role not found, or one or more requested policy_ref_names don't exist.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
rolePolicyRoutes.put(
    '/role/:role_id',
    hasAnyPermission(
        ['auth:update:role_policy', 'auth:admin:role_policy'],
        false
    ),
    validationMiddleware(replaceValidator),
    RolePolicyController.replaceRolePolicies
);

/**
 * @openapi
 * /api/role-policy/role/{role_id}:
 *   delete:
 *     summary: Detach one or more policies from a role
 *     description: >
 *       Requires `auth:remove:role_policy` or `auth:admin:role_policy` in the
 *       caller's current scope, plus the channel-ownership check described on
 *       GET above. Every ref_name in `policy_ref_names` must already exist (404
 *       otherwise). **Unlike add/replace above, there is no system/global policy
 *       protection on destroy** — a channel-scoped API key with this permission
 *       grant can remove a system/global policy from a role in its channel (not
 *       confirmed intentional; flagged for review, not fixed as part of this
 *       pass — see ENGINEERING_AUDIT.md). The caller must also already hold
 *       every policy being removed (403 otherwise), unless
 *       superadmin/root-superadmin.
 *     tags: [Role-Policy]
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [policy_ref_names]
 *             properties:
 *               policy_ref_names:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *     responses:
 *       200:
 *         description: Removal confirmed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Role policy successfully deleted
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
 *         description: "Missing/invalid x-api-key; caller lacks the required permission; or (channel-scoped key only) the role isn't in the caller's channel (message: 'Unauthorized to delete permissions to this role')."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Role not found, or one or more requested policy_ref_names don't exist as Policies.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
rolePolicyRoutes.delete(
    '/role/:role_id',
    hasAnyPermission(
        ['auth:remove:role_policy', 'auth:admin:role_policy'],
        false
    ),
    validationMiddleware(deleteValidator),
    RolePolicyController.destroyRolePolicies
);

export default rolePolicyRoutes;
