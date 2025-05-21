// middleware/authorize.ts
import { NextFunction, Request, Response } from 'express';
import Channel from '../database/models/Channel';
import User from '../database/models/User';
import { IAuthenticatedRequest } from '../types';
import { throwError } from './errorHandler';

export default function checkPermission(permissionRefName: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // 1. Check if x-api-key is GLOBAL or channel-based
            // 2. If GLOBAL, loop through user's roles that have null channel_id, check each if the specific permission is attached to it.
            // 3, If Channel based, loop through user's roles that have the appropriate channel id of channel_id, check each if the specific permission is attached to it.
            const apiKey = req.header('x-api-key');

            if (!apiKey) return throwError('API key not found', 403);

            const decoded = (req as IAuthenticatedRequest).user;
            const user = await User.findByPk(decoded.id);
            let isAuthorized = false;
            let roles = null;

            if (!user) return throwError('User not found', 404);

            if (apiKey == 'GLOBAL') {
                // Global roles to check
                roles = await user.getRoles({
                    where: {
                        channel_id: null
                    }
                });
            } else {
                const channel = await Channel.findOne({
                    where: {
                        api_key: apiKey
                    }
                });

                if (!channel) return throwError('Channel not found', 404);

                roles = await user.getRoles({
                    where: {
                        channel_id: channel.id
                    }
                });
            }

            for (const role of roles) {
                const permissions = await role.getPermissions();

                for (const permission of permissions) {
                    if (permission.ref_name === req.params.permission_ref_name) {
                        isAuthorized = true;
                        break;
                    }
                }

                if (isAuthorized) break;
            }

            return isAuthorized ? res.json({ status: 1 }) : throwError('Forbidden', 403);
        } catch (error: unknown) {
            next(error);
        }
    };
}
