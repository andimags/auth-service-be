import { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from './errorHandler';

const errorMsg =
    'You do not have the required permissions to perform this action';

export default function hasAnyPermission(
    permissionRefNames: string | string[],
    requireGlobalRole: boolean = true
): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const authorizedUser = req.authorizedUser!;

            if(req.isGlobalScope && (authorizedUser.isSuperadmin() || authorizedUser.isRootSuperadmin())) {
                return next();
            }

            // If requireGlobalRole == true, only global roles are allowed
            if (requireGlobalRole) {
                const hasGlobalPermission = await (authorizedUser)
                .hasAnyPermission(
                    permissionRefNames,
                    'global'
                );

                if(!hasGlobalPermission){
                    throw new AppError(errorMsg, 403);
                }
                else{
                    return next()
                }
            }

            const hasScopedPermission = await (authorizedUser)
                .hasAnyPermission(
                    permissionRefNames,
                    req.isGlobalScope ? 'global' : 'channel',
                    req.channel?.id ?? undefined
                );

            if (hasScopedPermission) {
                return next(); // Continue to next middleware/route handler
            }

            throw new AppError(errorMsg, 403);
        } catch (error: unknown) {
            next(error);
        }
    };
}
