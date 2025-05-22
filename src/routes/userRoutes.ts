import { Router } from 'express';
import userController from '../controllers/userController';
import { authMiddleware } from '../middlewares/authMiddleware';
import checkPermission from '../middlewares/checkPermission';

const userRoutes = Router();

userRoutes.get('/', authMiddleware, checkPermission(['view:user', 'admin:user']) , userController.getAll);
userRoutes.get('/:id', userController.find);
userRoutes.post('/', userController.add);
userRoutes.put('/:id', userController.update);
userRoutes.delete('/:id', userController.destroy);

export default userRoutes;
