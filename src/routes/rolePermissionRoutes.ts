import { Router } from 'express';
import rolePermissionController from '../controllers/rolePermissionController';
import checkPermission from '../middlewares/checkPermission';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { addValidator } from '../validators/role-permission/addValidator';
import { deleteValidator } from '../validators/role-permission/deleteValidator';
import { getValidator } from '../validators/role-permission/getValidator';
import { replaceValidator } from '../validators/role-permission/replaceValidator';

const rolePermissionRoutes = Router();

rolePermissionRoutes.get(
    '/role/:role_id',
    checkPermission(['view:role_permission', 'admin:role_permission'], false),
    validationMiddleware(getValidator),
    rolePermissionController.getRolePermissions
);

rolePermissionRoutes.post(
    '/role/:role_id',
    checkPermission(['assign:role_permission', 'admin:role_permission'], false),
    validationMiddleware(addValidator),
    rolePermissionController.addRolePermissions
);

rolePermissionRoutes.put(
    '/role/:role_id',
    checkPermission(['update:role_permission', 'admin:role_permission'], false),
    validationMiddleware(replaceValidator),
    rolePermissionController.replaceRolePermissions
);

rolePermissionRoutes.delete(
    '/role/:role_id',
    checkPermission(['remove:role_permission', 'admin:role_permission'], false),
    validationMiddleware(deleteValidator),
    rolePermissionController.destroyRolePermission
);

export default rolePermissionRoutes;
