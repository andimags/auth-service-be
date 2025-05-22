// middleware/authorize.ts
import { NextFunction, Request, Response } from 'express';
import { Op } from 'sequelize';
import Channel from '../database/models/Channel';
import User from '../database/models/User';
import { IAuthenticatedRequest } from '../types';
import { AppError } from './errorHandler';

export default function checkPermission(permissionRefName: string, channelRefName: string) {
    return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
        try {
            // 1. Check if x-api-key is match to the channel with ref_name from channelRefName variable
            // 2. If x-api-key is GLOBAL, check user's roles with channel_id as NULL
            // 3. If x-api-key has value, check user's roles with channel_id that has value
            // 4. Loop through the roles and check if it has permission with ref_name from permissionRefName variable
            const apiKey = req.header('x-api-key');
            const decoded = (req as IAuthenticatedRequest).user;
            const user = await User.findByPk(decoded.id);

            let roles = null;
            let isAuthorized = false;

            if (!apiKey) throw new AppError('API Key not found', 401);

            if(channelRefName == 'GLOBAL' && apiKey == 'GLOBAL'){
                roles = await user?.getRoles({where: { channel_id: {[Op.is]: null}}});
                if (!roles) throw new AppError('User has no global roles assigned', 401);
            }
            else{
                const channel = await Channel.findOne({where: {api_key: apiKey}});
                if (!channel) throw new AppError('Invalid API Key', 401);
                roles = await user?.getRoles({where: {channel_id: channel.id}});
                if (!roles) throw new AppError(`User has no roles assigned for ${channel.name} channel`, 401);
            }

                    for (const role of roles) {
            const permissions = await role.getPermissions();

            for (const permission of permissions) {
                if (permission.ref_name === permissionRefName) {
                    isAuthorized = true;
                    break;
                }
            }

            if (isAuthorized) break;
        }

        if (isAuthorized) {
            next();
        } else {
            throw new AppError('Unauthorized', 401);
        }
        } catch (error: unknown) {
            next(error);
        }
    };
}
