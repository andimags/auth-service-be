import { NextFunction, Request, RequestHandler, Response } from 'express';
import { userHasPermissions } from '../services/permissionService';
import { AppError } from './errorHandler';

const errorMsg = 'You do not have the required permissions to perform this action';

// Checks permission on GLOBAL scope only
// If roleScope == 'global', it only allows permissions attached to a global role and not channel-based roles
export default function checkPermission(
    permissionRefNames: string | string[],
    requireGlobalRole: boolean = true
): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const apiKey = req.header('x-api-key');

            // Check for global permissions first
            const _userHasPermissionsOnGlobalRoles = await userHasPermissions(
                req.authorizedUser,
                permissionRefNames
            );

            console.log('apiKey?.toLowerCase() === ', apiKey?.toLowerCase() === 'global')

            if (_userHasPermissionsOnGlobalRoles) {
                req.isGlobalRole = true;
                return next(); // Continue to next middleware/route handler
            }


            // Special handling for global API key
            if (apiKey?.toLowerCase() === 'global' && !_userHasPermissionsOnGlobalRoles) {
                console.warn('No global roles attached to this user');
                throw new AppError(errorMsg, 403)
            }

            // If roleScope is 'global', only global permissions are allowed
            if (requireGlobalRole) {
                console.warn('Only users with global role for this permission must be allowed');
                throw new AppError('Only users with global role for this permission must be allowed', 403)
            }

            // Check for channel-based roles (only if roleScope is 'channel')
            const channelId = req.channel!.id;

            const _userHasPermissionsOnChannelBasedRoles = await userHasPermissions(
                req.authorizedUser,
                permissionRefNames,
                'global',
                channelId
            );

            if (_userHasPermissionsOnChannelBasedRoles) {
                req.isGlobalRole = false;
                return next(); // Continue to next middleware/route handler
            }
            throw new AppError(errorMsg, 403)
        } catch (error: unknown) {
            next(error);
        }
    };
}