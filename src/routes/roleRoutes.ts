import { Router } from 'express';
import roleController from '../controllers/roleController';
import hasAnyPermission from '../middlewares/hasAnyPermission';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { addValidator } from '../validators/role/addValidator';
import { deleteValidator } from '../validators/role/deleteValidator';
import { findValidator } from '../validators/role/findValidator';
import { updateValidator } from '../validators/role/updateValidator';

const roleRoutes = Router();

roleRoutes.get(
    '/',
    hasAnyPermission(['auth:view:role', 'auth:admin:role'], false),
    roleController.getAll
);

roleRoutes.get(
    '/:role_id',
    hasAnyPermission(['auth:view:role', 'auth:admin:role'], false),
    validationMiddleware(findValidator),
    roleController.find
);

roleRoutes.post(
    '/',
    hasAnyPermission(['auth:add:role', 'auth:admin:role'], false),
    validationMiddleware(addValidator),
    roleController.add
);

roleRoutes.put(
    '/:role_id',
    hasAnyPermission(['auth:update:role', 'auth:admin:role'], false),
    validationMiddleware(updateValidator),
    roleController.update
);

roleRoutes.delete(
    '/:role_id',
    hasAnyPermission(['auth:delete:role', 'auth:admin:role'], false),
    validationMiddleware(deleteValidator),
    roleController.destroy
);

export default roleRoutes;
