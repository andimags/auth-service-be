import { Router } from 'express';
import permissionController from '../controllers/permissionController';
import { blockIfGlobalPermission } from '../middlewares/blockIfGlobalPermission';

const permissionRoutes = Router();

permissionRoutes.get('/', permissionController.getAll);
permissionRoutes.get('/:id', permissionController.find);
permissionRoutes.post('/', permissionController.add);
permissionRoutes.put('/:id', blockIfGlobalPermission, permissionController.update);
permissionRoutes.delete('/:id', blockIfGlobalPermission, permissionController.destroy);

export default permissionRoutes;
