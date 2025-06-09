import { Router } from 'express';
import userController from '../controllers/userController';
import checkPermission from '../middlewares/checkPermission';

const userRoutes = Router();

userRoutes.get(
    '/', 
    checkPermission(['view:user', 'admin:user']),
    userController.getAll
);

userRoutes.get(
    '/:id', 
    checkPermission(['view:user', 'admin:user']),
    userController.find
);
userRoutes.post(
    '/',
    checkPermission(['add:user', 'admin:user']),
    userController.add
);
userRoutes.put(
    '/:id', 
    checkPermission(['update:user', 'admin:user']),
    userController.update
);

userRoutes.delete(
    '/:id',
    checkPermission(['delete:user', 'admin:user'], 'global'),
    userController.destroy
);

export default userRoutes;
