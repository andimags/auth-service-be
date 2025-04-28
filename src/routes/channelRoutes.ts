import { Router } from 'express';
import channelController from '../controllers/channelController';

const channelRoutes = Router();

channelRoutes.get('/', channelController.getAll);
channelRoutes.get('/:id', channelController.find);
channelRoutes.post('/', channelController.add);
channelRoutes.put('/:id', channelController.update);
channelRoutes.delete('/:id', channelController.destroy);

export default channelRoutes;
