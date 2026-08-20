import { NextFunction, Request, Response } from 'express';
import { AppError } from '../../middlewares/errorHandler';
import { HttpStatus } from '../../constants/httpStatus';

/**
 * GET /api/auth/has-any-permission — returns `{ status: 1 }` when the caller
 * holds at least one of the requested permission ref_names in the given role
 * scope, otherwise 403.
 */
export const hasAnyPermission = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const token = req.header('Authorization')?.split(' ')[1];
        if (!token) throw new AppError('Token not found', HttpStatus.NOT_FOUND);

        // channelId is forwarded only for channel scope; global scope passes
        // undefined so getUserPermissions doesn't demand a channel it won't use.
        const hasPermissions = await req.authorizedUser!.hasAnyPermission(
            req.body.permission_ref_names,
            req.body.role_scope,
            req.isGlobalScope ? undefined : req.channel?.id
        );

        if (!hasPermissions) throw new AppError('Unauthorized', HttpStatus.FORBIDDEN);

        res.json({ status: 1 });
    } catch (error: unknown) {
        next(error);
    }
};
