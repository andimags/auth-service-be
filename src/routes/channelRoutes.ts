import { Router } from 'express';
import channelController from '../controllers/channelController';
import hasAnyPermission from '../middlewares/hasAnyPermission';
import { validationMiddleware } from '../middlewares/validationMiddleware';
import { addValidator } from '../validators/channel/addValidator';
import { deleteValidator } from '../validators/channel/deleteValidator';
import { findValidator } from '../validators/channel/findValidator';
import { updateValidator } from '../validators/channel/updateValidator';

const channelRoutes = Router();

channelRoutes.get(
    '/',
    hasAnyPermission(['view:channel', 'admin:channel'], false),
    channelController.getAll
);

channelRoutes.get(
    '/:channel_id',
    hasAnyPermission(['view:channel', 'admin:channel'], false),
    validationMiddleware(findValidator),
    channelController.find
);

channelRoutes.post(
    '/',
    hasAnyPermission(['add:channel', 'admin:channel']),
    validationMiddleware(addValidator),
    channelController.add
);

channelRoutes.put(
    '/:channel_id',
    hasAnyPermission(['update:channel', 'admin:channel'], false),
    validationMiddleware(updateValidator),
    channelController.update
);

channelRoutes.delete(
    '/:channel_id',
    hasAnyPermission(['delete:channel', 'admin:channel']),
    validationMiddleware(deleteValidator),
    channelController.destroy
);

export default channelRoutes;
