import { NextFunction, Request, Response } from 'express';
import Permission from '../database/models/Permission';
import { isPermissionOnGlobalRole } from '../utils/permissionUtil';
import { AppError } from './errorHandler';

export const blockIfGlobalPermission = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        const permission = await Permission.findByPk(req.params.id);

        if(!permission) throw new AppError('Permission not found');

        const belongsToGlobalRole = await isPermissionOnGlobalRole(permission.ref_name);

        if(!belongsToGlobalRole) next();
    } catch (error: any) {
        console.error('Token verification failed:', error.message ?? error);

        throw new AppError('Invalid or expired token', 403);
    }
};
