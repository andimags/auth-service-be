import { Router } from 'express';
import channelController from '../controllers/channelController';
import checkPermission from '../middlewares/checkPermission';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { addValidator } from '../validators/channel/addValidator';
import { deleteValidator } from '../validators/channel/deleteValidator';
import { findValidator } from '../validators/channel/findValidator';
import { updateValidator } from '../validators/channel/updateValidator';

const channelRoutes = Router();

channelRoutes.get(
    '/',
    checkPermission(['view:channel', 'admin:channel'], false),
    channelController.getAll
);

channelRoutes.get(
    '/:channel_id',
    checkPermission(['view:channel', 'admin:channel'], false),
    validationMiddleware(findValidator),
    channelController.find
);

channelRoutes.post(
    '/',
    checkPermission(['add:channel', 'admin:channel']),
    validationMiddleware(addValidator),
    channelController.add
);

channelRoutes.put(
    '/:channel_id',
    checkPermission(['update:channel', 'admin:channel'], false),
    validationMiddleware(updateValidator),
    channelController.update
);

channelRoutes.delete(
    '/:channel_id',
    checkPermission(['delete:channel', 'admin:channel']),
    validationMiddleware(deleteValidator),
    channelController.destroy
);

export default channelRoutes;
