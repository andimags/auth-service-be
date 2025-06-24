import { NextFunction, Request, RequestHandler, Response } from 'express';
import User from '../database/models/User';
import { userHasPermissions } from '../services/permissionService';
import { IRequestWithChannel, IRequestWithUserAndChannel } from '../types';
import { AppError } from './errorHandler';

const errorMsg = 'You do not have the required permissions to perform this action';

// Checks permission on GLOBAL scope only
// If roleScope == 'global', it only allows permissions attached to a global role and not channel-based roles
export default function checkPermission(
    permissionRefNames: string | string[],
    roleScope: 'channel' | 'global' = 'channel'
): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
        const customReq = req as unknown as IRequestWithUserAndChannel;

        try {
            const decoded = customReq.user;
            const user = await User.findByPk(decoded.id);
            const apiKey = req.header('x-api-key');

            // Check for global permissions first
            const _userHasPermissionsOnGlobalRoles = await userHasPermissions(
                user!.id,
                permissionRefNames
            );

            if (_userHasPermissionsOnGlobalRoles) {
                customReq.isGlobalRole = true;
                return next(); // Continue to next middleware/route handler
            }

            // Special handling for global API key
            if (!_userHasPermissionsOnGlobalRoles && apiKey?.toLowerCase() === 'global') {
                console.warn('No global roles attached to this user');
                throw new AppError(errorMsg, 403)
            }

            // If roleScope is 'global', only global permissions are allowed
            if (roleScope === 'global') {
                console.warn('Only users with global role for this permission must be allowed');
                throw new AppError(errorMsg, 403)
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
                customReq.isGlobalRole = false;
                return next(); // Continue to next middleware/route handler
            }

            throw new AppError(errorMsg, 403)
        } catch (error: unknown) {
            next(error);
        }
    };
}