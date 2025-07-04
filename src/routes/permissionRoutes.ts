import { Router } from 'express';
import permissionController from '../controllers/permissionController';
import checkPermission from '../middlewares/checkPermission';

const permissionRoutes = Router();

permissionRoutes.get(
    '/',
    checkPermission(['view:permission', 'admin:permission'], false),
    permissionController.getAll
);

permissionRoutes.get(
    '/:permission_id',
    checkPermission(['view:permission', 'admin:permission'], false),
    permissionController.find
);

permissionRoutes.post(
    '/',
    checkPermission(['add:permission', 'admin:permission'], false),
    permissionController.add
);

permissionRoutes.put(
    '/:permission_id',
    checkPermission(['update:permission', 'admin:permission'], false),
    permissionController.update
);
permissionRoutes.delete(
    '/:permission_id',
    checkPermission(['delete:permission', 'admin:permission']),
    permissionController.destroy
);

export default permissionRoutes;
