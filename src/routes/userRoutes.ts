import { Router } from 'express';
import userController from '../controllers/userController';
import checkPermission from '../middlewares/checkPermission';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { addValidator } from '../validators/user/addValidator';
import { findValidator } from '../validators/user/findValidator';
import { updateValidator } from '../validators/user/updateValidator';
import { deleteValidator } from '../validators/user/deleteValidator';

const userRoutes = Router();

userRoutes.get(
    '/',
    checkPermission(['view:user', 'admin:user'], false),
    userController.getAll
);

userRoutes.get(
    '/:user_id',
    validationMiddleware(findValidator),
    userController.find
);

userRoutes.post(
    '/',
    checkPermission(['add:user', 'admin:user'], false),
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
    checkPermission(['delete:user', 'admin:user']),
    validationMiddleware(deleteValidator),
    userController.destroy
);

export default userRoutes;
