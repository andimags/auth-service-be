import { Router } from 'express';
import rolePermissionController from '../controllers/rolePermissionController';

const rolePermissionRoutes = Router();

rolePermissionRoutes.get('/role/:role_id', rolePermissionController.getRolePermissions);
rolePermissionRoutes.post('/role/:role_id', rolePermissionController.addRolePermissions);
rolePermissionRoutes.put('/role/:role_id', rolePermissionController.replaceRolePermissions);
rolePermissionRoutes.delete(
    '/role/:role_id/permission/:permission_id',
    rolePermissionController.destroyRolePermission
);

export default rolePermissionRoutes;
