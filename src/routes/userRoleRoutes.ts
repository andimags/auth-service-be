import { Router } from 'express';
import userRoleController from '../controllers/userRoleController';
import checkPermission from '../middlewares/checkPermission';

const userRoleRoutes = Router();

userRoleRoutes.get(
    '/user/:user_id',
    checkPermission(['view:user_role', 'admin:user_role'], false),
    userRoleController.getUserRoles
);

userRoleRoutes.post(
    '/user/:user_id',
    checkPermission(['assign:user_role', 'admin:user_role'], false),
    userRoleController.addUserRoles
);

userRoleRoutes.put(
    '/user/:user_id',
    checkPermission(['update:user_role', 'admin:user_role'], false),
    userRoleController.replaceUserRoles
);
userRoleRoutes.delete(
    '/user/:user_id',
    checkPermission(['remove:user_role', 'admin:user_role'], false),
    userRoleController.destroyUserRole
);

export default userRoleRoutes;
