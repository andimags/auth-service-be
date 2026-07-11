import { Router } from 'express';
import PolicyPermissionController from '../controllers/policyPermissionController';
import hasAnyPermission from '../middlewares/hasAnyPermission';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { addValidator } from '../validators/policy-permission/addValidator';
import { deleteValidator } from '../validators/policy-permission/deleteValidator';
import { findValidator } from '../validators/policy-permission/findValidator';
import { replaceValidator } from '../validators/policy-permission/replaceValidator';

const policyPermissionRoutes = Router();

/**
 * @openapi
 * /api/policy-permission/policy/{policy_id}:
 *   get:
 *     summary: List the permissions attached to a policy
 *     description: >
 *       Requires `auth:view:policy_permission` or `auth:admin:policy_permission`
 *       in the caller's current scope. No channel-ownership check — Policy is a
 *       shared/global resource (see Policies).
 *     tags: [Policy-Permission]
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
 *         description: Permissions currently attached to the policy.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Permission'
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
policyPermissionRoutes.get(
    '/policy/:policy_id',
    hasAnyPermission(['auth:view:policy_permission', 'auth:admin:policy_permission'], false),
    validationMiddleware(findValidator),
    PolicyPermissionController.getPolicyPermissions
);

/**
 * @openapi
 * /api/policy-permission/policy/{policy_id}:
 *   post:
 *     summary: Attach one or more permissions to a policy
 *     description: >
 *       Requires `auth:assign:policy_permission` or `auth:admin:policy_permission`
 *       in the caller's current scope. Every ref_name in `permission_ref_names`
 *       must already exist as a Permission (404 listing any that don't). When
 *       channel-scoped (not `x-api-key: global`), system permissions
 *       (`is_system: true`) cannot be assigned this way (403). No
 *       channel-ownership check on the policy itself (Policy is a shared/global
 *       resource). The caller must also already hold every permission they're
 *       assigning (403, "not assignable by the auth user", otherwise), unless
 *       superadmin/root-superadmin.
 *     tags: [Policy-Permission]
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
 *             required: [permission_ref_names]
 *             properties:
 *               permission_ref_names:
 *                 description: A single ref_name or an array of ref_names.
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *           example:
 *             permission_ref_names: [auth:view:channel, auth:update:channel]
 *     responses:
 *       200:
 *         description: The permissions that were added (full Permission records for the requested ref_names).
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Permission'
 *       400:
 *         description: Validation failed (permission_ref_names missing or not string(s)).
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
 *         description: "Missing/invalid x-api-key; caller lacks the required permission; or (channel-scoped key only) one or more requested permissions are system/global (message: 'Global permissions cannot be assigned using a channel-scoped API key')."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Policy not found, or one or more requested permission_ref_names don't exist as Permissions.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
policyPermissionRoutes.post(
    '/policy/:policy_id',
    hasAnyPermission(
        ['auth:assign:policy_permission', 'auth:admin:policy_permission'],
        false
    ),
    validationMiddleware(addValidator),
    PolicyPermissionController.addPolicyPermissions
);

/**
 * @openapi
 * /api/policy-permission/policy/{policy_id}:
 *   put:
 *     summary: Replace the full set of permissions attached to a policy
 *     description: >
 *       Requires `auth:update:policy_permission` or
 *       `auth:admin:policy_permission` in the caller's current scope. Every
 *       ref_name in `permission_ref_names` must already exist (404 otherwise).
 *       When channel-scoped, this endpoint additionally forbids the request from
 *       introducing any new system/global permission, or dropping (by omission)
 *       any system/global permission the policy already has (403 either way) —
 *       a channel-scoped API key can only change the non-system slice of a
 *       policy's permissions. Unlike POST/DELETE on this resource, the
 *       "caller must already hold every permission being set" check here is
 *       implemented correctly (it checks the actual requested ref_names, not an
 *       empty placeholder), so it meaningfully blocks a non-superadmin caller
 *       from granting permissions they don't themselves hold.
 *     tags: [Policy-Permission]
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
 *             required: [permission_ref_names]
 *             properties:
 *               permission_ref_names:
 *                 description: A single ref_name or an array of ref_names — this becomes the policy's complete permission set.
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *     responses:
 *       200:
 *         description: The policy's new full set of permissions.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Permission'
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
 *         description: "Missing/invalid x-api-key; caller lacks the required permission; (channel-scoped key only) the request adds or removes a system/global permission; or the caller doesn't hold one or more of the requested permissions themselves (message: 'Permission ref names ... are not assignable by the auth user', returned with a 404 status despite being an authorization failure)."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Policy not found, one or more requested permission_ref_names don't exist, or (see above) the caller-privilege check failing also reports via 404.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
policyPermissionRoutes.put(
    '/policy/:policy_id',
    hasAnyPermission(
        ['auth:update:policy_permission', 'auth:admin:policy_permission'],
        false
    ),
    validationMiddleware(replaceValidator),
    PolicyPermissionController.replacePolicyPermissions
);

/**
 * @openapi
 * /api/policy-permission/policy/{policy_id}:
 *   delete:
 *     summary: Detach one or more permissions from a policy
 *     description: >
 *       Requires `auth:remove:policy_permission` or
 *       `auth:admin:policy_permission` in the caller's current scope. Every
 *       ref_name in `permission_ref_names` must already exist as a Permission
 *       (404 otherwise). **Unlike add/replace above, there is no system/global
 *       permission protection on destroy** — a channel-scoped API key with this
 *       permission grant can remove a system/global permission from a policy
 *       (not confirmed intentional; flagged for review, not fixed as part of
 *       this pass — see ENGINEERING_AUDIT.md). The caller must also already
 *       hold every permission being removed (403 otherwise), unless
 *       superadmin/root-superadmin.
 *     tags: [Policy-Permission]
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
 *             required: [permission_ref_names]
 *             properties:
 *               permission_ref_names:
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
 *                   example: Policy permission successfully deleted
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
 *         description: Missing/invalid x-api-key, or caller lacks the required permission.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Policy not found, or one or more requested permission_ref_names don't exist as Permissions.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
policyPermissionRoutes.delete(
    '/policy/:policy_id',
    hasAnyPermission(
        ['auth:remove:policy_permission', 'auth:admin:policy_permission'],
        false
    ),
    validationMiddleware(deleteValidator),
    PolicyPermissionController.destroyPolicyPermissions
);

export default policyPermissionRoutes;
