import { Router } from 'express';
import permissionController from '../controllers/permissionController';
import hasAnyPermission from '../middlewares/hasAnyPermission';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { addValidator } from '../validators/permission/addValidator';
import { deleteValidator } from '../validators/permission/deleteValidator';
import { findValidator } from '../validators/permission/findValidator';
import { updateValidator } from '../validators/permission/updateValidator';

const permissionRoutes = Router();

permissionRoutes.get(
    '/',
    hasAnyPermission(['auth:view:permission', 'auth:admin:permission'], false),
    permissionController.getAll
);

permissionRoutes.get(
    '/:permission_id',
    hasAnyPermission(['auth:view:permission', 'auth:admin:permission'], false),
    validationMiddleware(findValidator),
    permissionController.find
);

permissionRoutes.post(
    '/',
    hasAnyPermission(['auth:add:permission', 'auth:admin:permission'], false),
    validationMiddleware(addValidator),
    permissionController.add
);

permissionRoutes.put(
    '/:permission_id',
    hasAnyPermission(['auth:update:permission', 'auth:admin:permission'], false),
    validationMiddleware(updateValidator),
    permissionController.update
);
permissionRoutes.delete(
    '/:permission_id',
    hasAnyPermission(['auth:delete:permission', 'auth:admin:permission']),
    validationMiddleware(deleteValidator),
    permissionController.destroy
);

export default permissionRoutes;
