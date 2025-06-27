import { Router } from 'express';
import channelController from '../controllers/channelController';
import checkPermission from '../middlewares/checkPermission';

const channelRoutes = Router();

channelRoutes.get(
    '/',
    checkPermission(['view:channel', 'admin:channel'], false),
    channelController.getAll
);

channelRoutes.get(
    '/:id',
    checkPermission(['view:channel', 'admin:channel'], false),
    channelController.find
);

channelRoutes.post('/', checkPermission(['add:channel', 'admin:channel']), channelController.add);

channelRoutes.put(
    '/:id',
    checkPermission(['update:channel', 'admin:channel'], false),
    channelController.update
);

channelRoutes.delete(
    '/:id',
    checkPermission(['delete:channel', 'admin:channel']),
    channelController.destroy
);

export default channelRoutes;
