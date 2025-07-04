import { NextFunction, Request, Response } from 'express';
import Permission from '../database/models/Permission';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';

const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let permissions = null;
        const authorizedUser = req.authorizedUser as User;

        if (req.isGlobalRole) {
            permissions = await Permission.findAll();
        } else {
            // Get only the permissions assigned to the authenticated user for the specific channel
            permissions = await authorizedUser.getPermissions(req.channel!.id);
        }

        res.json({
            status: 1,
            data: permissions
        });
    } catch (error: unknown) {
        next(error);
    }
};

const find = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const targetPermission = await Permission.findByPk(req.params.permission_id);
        if (!targetPermission) throw new AppError('Permission not found', 404)

        const hasAccessToPermission = await (req.authorizedUser as User).hasAccessToPermission(
            targetPermission.id,
            req.channel?.id ?? null
        );

        if (!req.isGlobalRole && !hasAccessToPermission) {
            throw new AppError(
                'You are not authorized to view this permission, as it is not assigned to any of your roles',
                403
            );
        }

        res.json({
            status: 1,
            data: targetPermission
        });
    } catch (error: unknown) {
        next(error);
    }
};

const add = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const permission = await Permission.create(req.body);

        res.json({
            status: 1,
            data: permission
        });
    } catch (error: unknown) {
        next(error);
    }
};

const update = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const targetPermission = await Permission.findByPk(req.params.permission_id);
        if (!targetPermission) throw new AppError('Permission not found', 404);

        const hasAccessToPermission = await (req.authorizedUser as User).hasAccessToPermission(
            targetPermission.id,
            req.channel?.id ?? undefined
        );

        if (!req.isGlobalRole && !hasAccessToPermission) {
            throw new AppError(
                'You are not authorized to update this permission, as it is not assigned to any of your roles',
                403
            );
        }

        await targetPermission?.update(req.body);

        res.json({
            status: 1,
            data: targetPermission
        });
    } catch (error: unknown) {
        next(error);
    }
};

const destroy = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const shouldForce = req.query.force === 'true';
        const targetPermission = await Permission.findByPk(req.params.permission_id, { paranoid: false });
        if (!targetPermission) throw new AppError('Permission not found', 404);

        await targetPermission?.destroy({ force: shouldForce });

        res.json({
            status: 1,
            message: shouldForce
                ? 'Permission successfully deleted permanently'
                : 'Permission successfully soft-deleted'
        });
    } catch (error: unknown) {
        next(error);
    }
};

export default {
    getAll,
    find,
    add,
    update,
    destroy
};
