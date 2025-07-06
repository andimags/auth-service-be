import { Router } from 'express';
import userController from '../controllers/userController';
import hasAnyPermission from '../middlewares/hasAnyPermission';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { addValidator } from '../validators/user/addValidator';
import { deleteValidator } from '../validators/user/deleteValidator';
import { findValidator } from '../validators/user/findValidator';
import { updateValidator } from '../validators/user/updateValidator';

const userRoutes = Router();

userRoutes.get(
    '/',
    hasAnyPermission(['view:user', 'admin:user'], false),
    userController.getAll
);

userRoutes.get(
    '/:user_id',
    validationMiddleware(findValidator),
    userController.find
);

userRoutes.post(
    '/',
    hasAnyPermission(['add:user', 'admin:user'], false),
    validationMiddleware(addValidator),
    userController.add
);

userRoutes.put(
    '/:user_id',
    validationMiddleware(updateValidator),
    userController.update
);

userRoutes.delete(
    '/:user_id',
    hasAnyPermission(['delete:user', 'admin:user']),
    validationMiddleware(deleteValidator),
    userController.destroy
);

export default userRoutes;
