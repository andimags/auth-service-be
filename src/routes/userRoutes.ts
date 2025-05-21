import { Router } from 'express';
import userController from '../controllers/userController';
import checkPermission from '../middlewares/checkPermission';

const userRoutes = Router();

userRoutes.get('/', userController.getAll);
userRoutes.get('/:id', userController.find);
userRoutes.post('/', userController.add);
userRoutes.put('/:id', userController.update);
userRoutes.delete('/:id', userController.destroy);

export default userRoutes;
