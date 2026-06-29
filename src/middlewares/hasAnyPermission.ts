import { NextFunction, Request, RequestHandler, Response } from 'express';
import User from '../database/models/User';
import { AppError } from './errorHandler';

const errorMsg =
    'You do not have the required permissions to perform this action';

export default function hasAnyPermission(
    permissionRefNames: string | string[],
    requireGlobalRole: boolean = true
): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const apiKey = req.header('x-api-key');
            const authorizedUser = req.authorizedUser as User;

            if(authorizedUser.isSuperadmin() || authorizedUser.isRootSuperadmin()) {
                console.log('User is superadmin, bypassing permission checks');
                req.isGlobalScope = true;
                return next();
            }

            // Check for global roles first
            const userHasAnyPermissionOnGlobalRoles = await (authorizedUser).hasAnyPermission(permissionRefNames, 'global');

            if (userHasAnyPermissionOnGlobalRoles) {
                req.isGlobalScope = true;
                return next(); // Continue to next middleware/route handler
            }

            // Special handling for global API key
            if (
                apiKey?.toLowerCase() === 'global' &&
                !userHasAnyPermissionOnGlobalRoles
            ) {
                console.warn('No global roles attached to this user');
                throw new AppError(errorMsg, 403);
            }

            // If requireGlobalRole == true, only global roles are allowed
            if (requireGlobalRole) {
                console.warn(
                    'Only users with global role for this permission must be allowed'
                );
                throw new AppError(errorMsg, 403);
            }

            // Check for global permissions on channel based roles
            const channelId = req.channel?.id;

            const userHasAnyPermissionOnChannelBasedRoles = await (
                req.authorizedUser as User
            ).hasAnyPermission(permissionRefNames, 'global', channelId);

            if (userHasAnyPermissionOnChannelBasedRoles) {
                req.isGlobalScope = false;
                return next(); // Continue to next middleware/route handler
            }
            throw new AppError(errorMsg, 403);
        } catch (error: unknown) {
            next(error);
        }
    };
}
