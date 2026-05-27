import { Router } from 'express';
import PolicyPermissionController from '../controllers/policyPermissionController';
import hasAnyPermission from '../middlewares/hasAnyPermission';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { addValidator } from '../validators/policy-permission/addValidator';
import { deleteValidator } from '../validators/policy-permission/deleteValidator';
import { getValidator } from '../validators/policy-permission/getValidator';
import { replaceValidator } from '../validators/policy-permission/replaceValidator';

const policyPermissionRoutes = Router();

policyPermissionRoutes.get(
    '/policy/:policy_id',
    hasAnyPermission(['view:policy_permission', 'admin:policy_permission'], false),
    validationMiddleware(getValidator),
    PolicyPermissionController.getPolicyPermissions
);

policyPermissionRoutes.post(
    '/policy/:policy_id',
    hasAnyPermission(
        ['assign:policy_permission', 'admin:policy_permission'],
        false
    ),
    validationMiddleware(addValidator),
    PolicyPermissionController.addPolicyPermissions
);

policyPermissionRoutes.put(
    '/policy/:policy_id',
    hasAnyPermission(
        ['update:policy_permission', 'admin:policy_permission'],
        false
    ),
    validationMiddleware(replaceValidator),
    PolicyPermissionController.replacePolicyPermissions
);

policyPermissionRoutes.delete(
    '/policy/:policy_id',
    hasAnyPermission(
        ['remove:policy_permission', 'admin:policy_permission'],
        false
    ),
    validationMiddleware(deleteValidator),
    PolicyPermissionController.destroyPolicyPermissions
);

export default policyPermissionRoutes;
