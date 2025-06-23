import { NextFunction, Request, RequestHandler, Response } from 'express';
import { Op } from 'sequelize';
import User from '../database/models/User';
import { IAuthenticatedRequest, IRequestWithChannel } from '../types';
import { AppError } from './errorHandler';
import { userHasPermissions } from '../services/permissionService';

// Checks permission on GLOBAL scope only
// If roleScope == 'global', it only allows permissions attached to a global role and not channel-based roles
export default function checkPermission(
    permissionRefNames: string | string[],
    roleScope: 'channel' | 'global' = 'channel'
): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
        const customReq = req as unknown as IAuthenticatedRequest;

        try {
            const decoded = customReq.user;
            const user = await User.findByPk(decoded.id);
            const apiKey = req.header('x-api-key');

            // Check for global permissions first
            const _userHasPermissionsOnGlobalRoles = await userHasPermissions(
                user!.id,
                permissionRefNames,
                'global'
            );

            if (_userHasPermissionsOnGlobalRoles) {
                return next(); // Continue to next middleware/route handler
            }

            // Special handling for global API key
            if (!_userHasPermissionsOnGlobalRoles && apiKey === 'global') {
                throw new AppError('No global roles attached to this user.', 403);
            }

            // If roleScope is 'global', only global permissions are allowed
            if (roleScope === 'global') {
                throw new AppError(
                    'Unauthorized. Only users with global role for this permission must be allowed.',
                    401
                );
            }

            // Check for channel-based roles (only if roleScope is 'channel')
            const channelId = (req as IRequestWithChannel).channel!.id;

            const _userHasPermissionsOnChannelBasedRoles = await userHasPermissions(
                user!.id,
                permissionRefNames,
                'channel',
                channelId
            );

            if (_userHasPermissionsOnChannelBasedRoles) {
                return next(); // Continue to next middleware/route handler
            }

            throw new AppError('Unauthorized', 401);
        } catch (error: unknown) {
            next(error);
        }
    };
}