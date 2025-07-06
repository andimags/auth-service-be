import { Router } from 'express';
import rolePermissionController from '../controllers/rolePermissionController';
import hasAnyPermission from '../middlewares/hasAnyPermission';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { addValidator } from '../validators/role-permission/addValidator';
import { deleteValidator } from '../validators/role-permission/deleteValidator';
import { getValidator } from '../validators/role-permission/getValidator';
import { replaceValidator } from '../validators/role-permission/replaceValidator';

const rolePermissionRoutes = Router();

rolePermissionRoutes.get(
    '/role/:role_id',
    hasAnyPermission(['view:role_permission', 'admin:role_permission'], false),
    validationMiddleware(getValidator),
    rolePermissionController.getRolePermissions
);

rolePermissionRoutes.post(
    '/role/:role_id',
    hasAnyPermission(['assign:role_permission', 'admin:role_permission'], false),
    validationMiddleware(addValidator),
    rolePermissionController.addRolePermissions
);

rolePermissionRoutes.put(
    '/role/:role_id',
    hasAnyPermission(['update:role_permission', 'admin:role_permission'], false),
    validationMiddleware(replaceValidator),
    rolePermissionController.replaceRolePermissions
);

rolePermissionRoutes.delete(
    '/role/:role_id',
    hasAnyPermission(['remove:role_permission', 'admin:role_permission'], false),
    validationMiddleware(deleteValidator),
    rolePermissionController.destroyRolePermission
);

export default rolePermissionRoutes;
