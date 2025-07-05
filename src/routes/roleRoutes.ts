import { Router } from 'express';
import roleController from '../controllers/roleController';
import checkPermission from '../middlewares/checkPermission';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { addValidator } from '../validators/role/addValidator';
import { deleteValidator } from '../validators/role/deleteValidator';
import { findValidator } from '../validators/role/findValidator';
import { updateValidator } from '../validators/role/updateValidator';

const roleRoutes = Router();

roleRoutes.get(
    '/',
    checkPermission(['view:role', 'admin:role'], false),
    roleController.getAll
);

roleRoutes.get(
    '/:role_id',
    checkPermission(['view:role', 'admin:role'], false),
    validationMiddleware(findValidator),
    roleController.find
);

roleRoutes.post(
    '/',
    checkPermission(['add:role', 'admin:role'], false),
    validationMiddleware(addValidator),
    roleController.add
);

roleRoutes.put(
    '/:role_id',
    checkPermission(['update:role', 'admin:role'], false),
    validationMiddleware(updateValidator),
    roleController.update
);

roleRoutes.delete(
    '/:role_id',
    checkPermission(['delete:role', 'admin:role'], false),
    validationMiddleware(deleteValidator),
    roleController.destroy
);

export default roleRoutes;
