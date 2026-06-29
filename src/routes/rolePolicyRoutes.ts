import { Router } from 'express';
import RolePolicyController from '../controllers/rolePolicyController';
import hasAnyPermission from '../middlewares/hasAnyPermission';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { addValidator } from '../validators/role-policy/addValidator';
import { deleteValidator } from '../validators/role-policy/deleteValidator';
import { getValidator } from '../validators/role-policy/getValidator';
import { replaceValidator } from '../validators/role-policy/replaceValidator';

const rolePolicyRoutes = Router();

rolePolicyRoutes.get(
    '/role/:role_id',
    hasAnyPermission(['auth:view:role_policy', 'auth:admin:role_policy'], false),
    validationMiddleware(getValidator),
    RolePolicyController.getRolePolicies
);

rolePolicyRoutes.post(
    '/role/:role_id',
    hasAnyPermission(
        ['auth:assign:role_policy', 'auth:admin:role_policy'],
        false
    ),
    validationMiddleware(addValidator),
    RolePolicyController.addRolePolicies
);

rolePolicyRoutes.put(
    '/role/:role_id',
    hasAnyPermission(
        ['auth:update:role_policy', 'auth:admin:role_policy'],
        false
    ),
    validationMiddleware(replaceValidator),
    RolePolicyController.replaceRolePolicies
);

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
