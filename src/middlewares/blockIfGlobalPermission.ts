import { NextFunction, Request, Response } from 'express';
import Permission from '../database/models/Permission';
import { isPermissionOnGlobalRole } from '../utils/permissionUtil';
import { AppError } from './errorHandler';

export const blockIfGlobalPermission = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> => {
    try {
        const permission = await Permission.findByPk(req.params.permission_id);

        if (!permission) throw new AppError('Permission not found', 404);

        const belongsToGlobalRole = await isPermissionOnGlobalRole(permission.ref_name);

        if (!belongsToGlobalRole) {
            next();
        } else {
            throw new AppError('Permission attached to a global role cannot be modified', 404);
        }
    } catch (error: any) {
        console.error('Something went wrong:', error.message ?? error);

        throw new AppError(error.message ?? error, 403);
    }
};
