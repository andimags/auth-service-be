import { Router } from 'express';
import PolicyPermissionController from '../controllers/policyPermissionController';
import hasAnyPermission from '../middlewares/hasAnyPermission';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { addValidator } from '../validators/policy-permission/addValidator';
import { deleteValidator } from '../validators/policy-permission/deleteValidator';
import { findValidator } from '../validators/policy-permission/findValidator';
import { replaceValidator } from '../validators/policy-permission/replaceValidator';

const policyPermissionRoutes = Router();

policyPermissionRoutes.get(
    '/policy/:policy_id',
    hasAnyPermission(['auth:view:policy_permission', 'auth:admin:policy_permission'], false),
    validationMiddleware(findValidator),
    PolicyPermissionController.getPolicyPermissions
);

policyPermissionRoutes.post(
    '/policy/:policy_id',
    hasAnyPermission(
        ['auth:assign:policy_permission', 'auth:admin:policy_permission'],
        false
    ),
    validationMiddleware(addValidator),
    PolicyPermissionController.addPolicyPermissions
);

policyPermissionRoutes.put(
    '/policy/:policy_id',
    hasAnyPermission(
        ['auth:update:policy_permission', 'auth:admin:policy_permission'],
        false
    ),
    validationMiddleware(replaceValidator),
    PolicyPermissionController.replacePolicyPermissions
);

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
