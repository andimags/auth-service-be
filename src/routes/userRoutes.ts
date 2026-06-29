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
    hasAnyPermission(['auth:view:user', 'auth:admin:user'], false),
    userController.getAll
);

userRoutes.get(
    '/:user_id',
    validationMiddleware(findValidator),
    userController.find
);

userRoutes.post(
    '/',
    hasAnyPermission(['auth:add:user', 'auth:admin:user'], false),
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
    hasAnyPermission(['auth:delete:user', 'auth:admin:user']),
    validationMiddleware(deleteValidator),
    userController.destroy
);

export default userRoutes;
