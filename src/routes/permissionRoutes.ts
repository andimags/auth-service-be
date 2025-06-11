import { Router } from 'express';
import permissionController from '../controllers/permissionController';
import { blockIfGlobalPermission } from '../middlewares/blockIfGlobalPermission';
import checkPermission from '../middlewares/checkPermission';

const permissionRoutes = Router();

permissionRoutes.get(
    '/',
    checkPermission(['view:permission', 'admin:permission']),
    permissionController.getAll
);

permissionRoutes.get(
    '/:id',
    checkPermission(['view:permission', 'admin:permission']),
    permissionController.find
);

permissionRoutes.post(
    '/',
    checkPermission(['add:permission', 'admin:permission']),
    permissionController.add
);

permissionRoutes.put(
    '/:id',
    checkPermission(['update:permission', 'admin:permission']),
    blockIfGlobalPermission,
    permissionController.update
);
permissionRoutes.delete(
    '/:id',
    checkPermission(['delete:permission', 'admin:permission']),
    blockIfGlobalPermission,
    permissionController.destroy
);

export default permissionRoutes;
