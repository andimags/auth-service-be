import { Router } from 'express';
import permissionController from '../controllers/permissionController';

const permissionRoutes = Router();

permissionRoutes.get('/', permissionController.getAll);
permissionRoutes.get('/:id', permissionController.find);
permissionRoutes.post('/', permissionController.add);
permissionRoutes.put('/:id', permissionController.update);
permissionRoutes.delete('/:id', permissionController.destroy);

export default permissionRoutes;
