import { Router } from 'express';
import roleController from '../controllers/roleController';
import checkPermission from '../middlewares/checkPermission';

const roleRoutes = Router();

roleRoutes.get(
    '/',
    checkPermission(['view:role', 'admin:role'], false),
    roleController.getAll
);

roleRoutes.get(
    '/:role_id',
    checkPermission(['view:role', 'admin:role'], false),
    roleController.find
);

roleRoutes.post(
    '/',
    checkPermission(['add:role', 'admin:role'], false),
    roleController.add
);

roleRoutes.put(
    '/:role_id',
    checkPermission(['update:role', 'admin:role'], false),
    roleController.update
);

roleRoutes.delete(
    '/:role_id',
    checkPermission(['delete:role', 'admin:role'], false),
    roleController.destroy
);

export default roleRoutes;
