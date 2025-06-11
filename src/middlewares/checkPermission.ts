import { NextFunction, Request, RequestHandler, Response } from 'express';
import { Op } from 'sequelize';
import User from '../database/models/User';
import { IAuthenticatedRequest, IRequestWithChannel } from '../types';
import { AppError } from './errorHandler';

// Checks permission on GLOBAL scope
// If roleScope == 'global', it only allows permissions attached to a global role and not channel-based roles
export default function checkPermission(
    permissionRefName: string | string[],
    roleScope: 'channel' | 'global' = 'channel'
): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
        const customReq = req as unknown as IAuthenticatedRequest;

        try {
            const decoded = customReq.user;
            const user = await User.findByPk(decoded.id);
            const apiKey = req.header('x-api-key');

            // Check for global roles first
            let globalRoles = await user?.getRoles({
                where: {channel_id: {[Op.is]: null},
                scope: 'global'
            }});

            if(globalRoles?.length == 0 && apiKey == 'GLOBAL') throw new AppError('No global roles attached to this user.', 403);
            
            if(globalRoles){
                for (const role of globalRoles) {
                    const whereCondition = Array.isArray(permissionRefName)
                    ? {
                        ref_name: { [Op.in]: permissionRefName },
                        scope: 'global'
                        }
                    : {
                        ref_name: permissionRefName,
                        scope: 'global'
                        };

                    const [permission] = await role.getPermissions({
                        where: whereCondition,
                        limit: 1,
                    });

                    if (permission) {
                        customReq.isGlobalRole = true
                        return next();
                    }
                }
            }

            if(roleScope == 'global'){
                throw new AppError('Unauthorized. Only users with global role for this permission must be allowed.', 401);
            }

            // Check for channel-based roles
            let channelBasedRoles = await user?.getRoles({where: {channel_id: (req as IRequestWithChannel)?.channel?.id}});

            if(channelBasedRoles){
                for (const role of channelBasedRoles) {
                    const whereCondition = Array.isArray(permissionRefName)
                    ? {
                        ref_name: { [Op.in]: permissionRefName },
                        scope: 'global',
                        }
                    : {
                        ref_name: permissionRefName,
                        scope: 'global',
                        };

                    const [permission] = await role.getPermissions({
                        where: whereCondition,
                        limit: 1,
                    });

                    if (permission) {
                        customReq.isGlobalRole = false
                        return next();
                    }
                }
            }

            throw new AppError('Unauthorized', 401);
        } catch (error: unknown) {
            next(error);
        }
    };
}
