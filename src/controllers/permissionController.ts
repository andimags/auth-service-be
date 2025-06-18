import { NextFunction, Request, Response } from 'express';
import Permission from '../database/models/Permission';
import User from '../database/models/User';
import { AppError } from '../middlewares/errorHandler';
import {
    checkPermissionLevel,
    getUserPermissions,
    hasAccessToPermission
} from '../services/permissionService';
import { IRequestWithUserAndChannel } from '../types';

const getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const customReq = req as IRequestWithUserAndChannel;
        let permissions = null;
        const authorizedUser = (await User.findByPk(customReq.user.id))!;
        const authorizedUserRoleLevel = (await checkPermissionLevel(
            ['update:role', 'admin:role'],
            authorizedUser,
            true
        ))!;

        if (customReq.isGlobalRole) {
            permissions = await Permission.findAll();
        } else {
            // Get only the permissions assigned to the authenticated user for the specific channel
            permissions = await getUserPermissions(
                customReq.user.id,
                authorizedUserRoleLevel,
                customReq.channel!.id
            );
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
        const customReq = req as IRequestWithUserAndChannel;
        const permission = await Permission.findByPk(req.params.id);

        if (!permission) {
            res.status(404).json({
                status: 0,
                message: 'Permission not found.'
            });

            return;
        }

        const _hasAccessToPermission = await hasAccessToPermission(
            customReq.user.id,
            permission.id,
            customReq.channel!.id
        );

        if (!customReq.isGlobalRole && !_hasAccessToPermission) {
            throw new AppError(
                'You are not authorized to view this permission, as it is not assigned to any of your roles.',
                403
            );
        }

        res.json({
            status: 1,
            data: permission
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
        const customReq = req as IRequestWithUserAndChannel;
        const permission = await Permission.findByPk(req.params.id);

        if (!permission) {
            res.status(404).json({
                status: 0,
                message: 'Permission not found.'
            });

            return;
        }

        const _hasAccessToPermission = await hasAccessToPermission(
            customReq.user.id,
            permission.id,
            customReq.channel!.id
        );

        if (!customReq.isGlobalRole && !_hasAccessToPermission) {
            throw new AppError(
                'You are not authorized to update this permission, as it is not assigned to any of your roles.',
                403
            );
        }

        await permission?.update(req.body);

        res.json({
            status: 1,
            data: permission
        });
    } catch (error: unknown) {
        next(error);
    }
};

const destroy = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const shouldForce = req.query.force === 'true';
        const permission = await Permission.findByPk(req.params.id, { paranoid: false });
        const customReq = req as IRequestWithUserAndChannel;

        if (!permission) {
            res.status(404).json({
                status: 0,
                message: 'Permission not found.'
            });

            return;
        }

        const _hasAccessToPermission = await hasAccessToPermission(
            customReq.user.id,
            permission.id,
            customReq.channel!.id
        );

        if (!customReq.isGlobalRole && !_hasAccessToPermission) {
            throw new AppError(
                'You are not authorized to delete this permission, as it is not assigned to any of your roles.',
                403
            );
        }

        if (!permission) {
            res.status(404).json({
                status: 0,
                message: 'Permission not found.'
            });
        }

        await permission?.destroy({ force: shouldForce });

        res.json({
            status: 1,
            message: shouldForce
                ? 'Permission successfully deleted permanently.'
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
