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
    hasAnyPermission(['auth:view:channel', 'auth:admin:channel'], false),
    channelController.getAll
);

channelRoutes.get(
    '/:channel_id',
    hasAnyPermission(['auth:view:channel', 'auth:admin:channel'], false),
    validationMiddleware(findValidator),
    channelController.find
);

channelRoutes.post(
    '/',
    hasAnyPermission(['auth:add:channel', 'auth:admin:channel'], true),
    validationMiddleware(addValidator),
    channelController.add
);

channelRoutes.put(
    '/:channel_id',
    hasAnyPermission(['auth:update:channel', 'auth:admin:channel'], false),
    validationMiddleware(updateValidator),
    channelController.update
);

channelRoutes.delete(
    '/:channel_id',
    hasAnyPermission(['auth:delete:channel', 'auth:admin:channel']),
    validationMiddleware(deleteValidator),
    channelController.destroy
);

export default channelRoutes;
