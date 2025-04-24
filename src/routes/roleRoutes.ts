import { Router } from 'express';
import roleController from '../controllers/roleController';

const roleRoutes = Router();

roleRoutes.get('/', roleController.getAll);
roleRoutes.get('/:id', roleController.find);
roleRoutes.post('/', roleController.add);
roleRoutes.put('/:id', roleController.update);
roleRoutes.delete('/:id', roleController.destroy);

export default roleRoutes;
