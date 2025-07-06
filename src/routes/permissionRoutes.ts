import { Router } from 'express';
import permissionController from '../controllers/permissionController';
import checkPermission from '../middlewares/checkPermission';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { addValidator } from '../validators/permission/addValidator';
import { deleteValidator } from '../validators/permission/deleteValidator';
import { findValidator } from '../validators/permission/findValidator';
import { updateValidator } from '../validators/permission/updateValidator';

const permissionRoutes = Router();

permissionRoutes.get(
    '/',
    checkPermission(['view:permission', 'admin:permission'], false),
    permissionController.getAll
);

permissionRoutes.get(
    '/:permission_id',
    checkPermission(['view:permission', 'admin:permission'], false),
    validationMiddleware(findValidator),
    permissionController.find
);

permissionRoutes.post(
    '/',
    checkPermission(['add:permission', 'admin:permission'], false),
    validationMiddleware(addValidator),
    permissionController.add
);

permissionRoutes.put(
    '/:permission_id',
    checkPermission(['update:permission', 'admin:permission'], false),
    validationMiddleware(updateValidator),
    permissionController.update
);
permissionRoutes.delete(
    '/:permission_id',
    checkPermission(['delete:permission', 'admin:permission']),
    validationMiddleware(deleteValidator),
    permissionController.destroy
);

export default permissionRoutes;
