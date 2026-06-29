import { Router } from 'express';
import userRoleController from '../controllers/userRoleController';
import hasAnyPermission from '../middlewares/hasAnyPermission';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { addValidator } from '../validators/user-role/addValidator';
import { deleteValidator } from '../validators/user-role/deleteValidator';
import { getValidator } from '../validators/user-role/getValidator';
import { replaceValidator } from '../validators/user-role/replaceValidator';

const userRoleRoutes = Router();

userRoleRoutes.get(
    '/user/:user_id',
    hasAnyPermission(['auth:view:user_role', 'auth:admin:user_role'], false),
    validationMiddleware(getValidator),
    userRoleController.getUserRoles
);

userRoleRoutes.post(
    '/user/:user_id',
    hasAnyPermission(['auth:assign:user_role', 'auth:admin:user_role'], false),
    validationMiddleware(addValidator),
    userRoleController.addUserRoles
);

userRoleRoutes.put(
    '/user/:user_id',
    hasAnyPermission(['auth:update:user_role', 'auth:admin:user_role'], false),
    validationMiddleware(replaceValidator),
    userRoleController.replaceUserRoles
);
userRoleRoutes.delete(
    '/user/:user_id',
    hasAnyPermission(['auth:remove:user_role', 'auth:admin:user_role'], false),
    validationMiddleware(deleteValidator),
    userRoleController.destroyUserRole
);

export default userRoleRoutes;
