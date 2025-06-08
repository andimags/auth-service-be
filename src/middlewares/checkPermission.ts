import { NextFunction, Request, RequestHandler, Response } from 'express';
import { Op } from 'sequelize';
import User from '../database/models/User';
import { IAuthenticatedRequest } from '../types';
import { AppError } from './errorHandler';

// Checks permission on GLOBAL scope
export default function checkPermission(
    permissionRefName: string | string[]
): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
        const typedReq = req as unknown as IAuthenticatedRequest;

        try {
            const decoded = typedReq.user;
            const user = await User.findByPk(decoded.id);

            let isAuthorized = false;
            let roles = null;

            roles = await user?.getRoles();
            if (!roles) throw new AppError('User has no roles assigned', 401);

            for (const role of roles) {
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
