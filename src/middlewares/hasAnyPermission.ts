import { NextFunction, Request, RequestHandler, Response } from 'express';
import { AppError } from './errorHandler';
import { HttpStatus } from '../constants/httpStatus';
import { getScopeType } from '../utils/getScopeType';

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
                    throw new AppError(errorMsg, HttpStatus.FORBIDDEN);
                }
                else{
                    return next();
                }
            }

            const hasScopedPermission = await (authorizedUser)
                .hasAnyPermission(
                    permissionRefNames,
                    getScopeType(req.isGlobalScope),
                    req.channel?.id ?? undefined
                );

            if (hasScopedPermission) {
                return next(); // Continue to next middleware/route handler
            }

            throw new AppError(errorMsg, HttpStatus.FORBIDDEN);
        } catch (error: unknown) {
            next(error);
        }
    };
}
