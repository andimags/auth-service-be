import { Router } from 'express';
import userController from '../controllers/userController';
import checkPermission from '../middlewares/checkPermission';

const userRoutes = Router();

userRoutes.get(
    '/', 
    checkPermission(['view:user', 'admin:user'], false), 
    userController.getAll
);

userRoutes.get(
    '/:id', 
    userController.find
);

userRoutes.post(
    '/', 
    checkPermission(['add:user', 'admin:user'], false), 
    userController.add
);

userRoutes.put(
    '/:id', 
    userController.update
);

userRoutes.delete(
    '/:id',
    checkPermission(['delete:user', 'admin:user']),
    userController.destroy
);

export default userRoutes;
