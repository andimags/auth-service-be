import { Router } from 'express';
import rolePermissionController from '../controllers/rolePermissionController';
import checkPermission from '../middlewares/checkPermission';

const rolePermissionRoutes = Router();

rolePermissionRoutes.get(
    '/role/:role_id', 
    checkPermission(['view:role_permission', 'admin:role_permission']),
    rolePermissionController.getRolePermissions
);

rolePermissionRoutes.post(
    '/role/:role_id', 
    checkPermission(['assign:role_permission', 'admin:role_permission']),
    rolePermissionController.addRolePermissions
);

rolePermissionRoutes.put(
    '/role/:role_id', 
    checkPermission(['update:role_permission', 'admin:role_permission']),
    rolePermissionController.replaceRolePermissions
);

rolePermissionRoutes.delete(
    '/role/:role_id/permission/:permission_id',
    checkPermission(['remove:role_permission', 'admin:role_permission']),
    rolePermissionController.destroyRolePermission
);

export default rolePermissionRoutes;
