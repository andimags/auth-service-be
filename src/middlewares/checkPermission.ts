// middleware/authorize.ts
import { NextFunction, Request, Response } from 'express';
import { Op } from 'sequelize';
import User from '../database/models/User';
import { IAuthenticatedRequest, IRequestWithChannel } from '../types';
import { AppError } from './errorHandler';

// Middleware for auth service, checks permission on GLOBAL or channel-based scope
export default function checkPermission(permissionRefName: string | string[], channelRefName: string | null = null) {
    return async (req: Request, res: Response, next: NextFunction): Promise<any> => {
        try {
            const decoded = (req as IAuthenticatedRequest).user;
            const user = await User.findByPk(decoded.id);

            let isAuthorized = false;
            let roles = null;

            if(!(req as IRequestWithChannel).channel){ // GLOBAL
                roles = await user?.getRoles({where: { channel_id: {[Op.is]: null}}});
                if (!roles) throw new AppError('User has no global roles assigned', 401);
            }
            else{ // Channel-based
                roles = await user?.getRoles({where: { channel_id: (req as IRequestWithChannel).channel.id}});
                if (!roles) throw new AppError(`No roles found associated with ${(req as IRequestWithChannel).channel.ref_name} channel`, 401);
            }

            for (const role of roles) {
                const whereCondition = Array.isArray(permissionRefName)
                    ? { ref_name: { [Op.in]: permissionRefName } }
                    : { ref_name: permissionRefName };

                const [permission] = await role.getPermissions({
                    where: whereCondition,
                    limit: 1,
                });

                if (permission) {
                    isAuthorized = true;
                    break;
                }
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
